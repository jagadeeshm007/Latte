import pg from "pg";

import { type Config, databaseUrl, usesTls } from "../config.ts";

// pg returns int8 and numeric as strings; parse them once here so sums,
// counts and costs are numbers everywhere (none of ours pass 2^53).
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));
// Dates stay as YYYY-MM-DD strings; a JS Date would shift them by time zone.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export type Pool = pg.Pool;
export type Client = pg.PoolClient;
export type Queryable = Pick<pg.Pool, "query">;

/** createPool builds the one pg pool per process. Nothing connects until the first query. */
export function createPool(
  config: Pick<Config, "DATABASE_URL" | "DB_POOL_MAX" | "DB_SSL" | "SUPABASE_POOLER_HOST">,
): pg.Pool {
  return new pg.Pool({
    connectionString: databaseUrl(config),
    max: config.DB_POOL_MAX,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    ...(usesTls(config) ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

/** inTransaction runs fn in one transaction and rolls back on any error. */
export async function inTransaction<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
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
