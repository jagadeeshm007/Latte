import { readFileSync } from "node:fs";

import pg from "pg";

import { type Config, databaseUrl, sslOptions } from "../config.ts";

// pg returns int8 and numeric as strings; parse them once here so sums,
// counts and costs are numbers everywhere (none of ours pass 2^53).
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));
// Dates stay as YYYY-MM-DD strings; a JS Date would shift them by time zone.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export type Pool = pg.Pool;
export type Client = pg.PoolClient;
export type Queryable = Pick<pg.Pool, "query">;

/**
 * The demo schema's path (ADR-0033). public is never on it: a table missing
 * from demo fails the query instead of reading real data.
 */
export const DEMO_SEARCH_PATH = "demo, extensions";

/**
 * createPool builds a pg pool. Nothing connects until the first query. With
 * searchPath, every connection sets it before its first query; pg runs a
 * client's queries in order, so none can run on the default path.
 */
export function createPool(
  config: Pick<
    Config,
    "DATABASE_URL" | "DB_POOL_MAX" | "DB_SSL" | "DB_SSL_CA" | "SUPABASE_POOLER_HOST"
  > & { searchPath?: string },
): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl(config),
    max: config.DB_POOL_MAX,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    ssl: sslOptions(config, (p) => readFileSync(p, "utf8")),
  });
  const { searchPath } = config;
  if (searchPath) {
    pool.on("connect", (client) => {
      // Closing on failure makes every query queued behind the SET fail too,
      // so none of them runs on the default path.
      client.query(`SET search_path TO ${searchPath}`).catch(() => client.end());
    });
  }
  return pool;
}

/** inTransaction runs fn in one transaction and rolls back on any error. */
export async function inTransaction<T>(
  pool: pg.Pool,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
