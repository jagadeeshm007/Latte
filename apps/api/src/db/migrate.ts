// Applies src/db/migrations/*.sql in name order, each in its own transaction,
// recording what ran in schema_migrations. A migration applied anywhere is
// never edited; a change is a new file. The same files then build the demo
// schema (ADR-0033), followed by the demo-only ones in migrations/demo.
// Run: pnpm --filter @scc/api migrate
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../config.ts";
import { createPool, DEMO_SEARCH_PATH, inTransaction, type Pool } from "./pool.ts";

const DIR = path.join(import.meta.dirname, "migrations");
const DEMO_DIR = path.join(DIR, "demo");

export async function migrate(
  pool: Pool,
  log: (line: string) => void = () => undefined,
  options: { demo?: boolean } = {},
): Promise<string[]> {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  await pool.query("ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY");
  const done = new Set(
    (await pool.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map(
      (r) => r.name,
    ),
  );
  const sqlFiles = async (dir: string) =>
    (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const files = [
    ...(await sqlFiles(DIR)),
    ...(options.demo ? (await sqlFiles(DEMO_DIR)).map((f) => `demo/${f}`) : []),
  ];
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) {
      continue;
    }
    const sql = await readFile(path.join(DIR, file), "utf8");
    await inTransaction(pool, async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    });
    applied.push(file);
    log(`applied ${file}`);
  }
  log(`migrate: ${String(files.length)} migrations, ${String(applied.length)} applied now`);
  return applied;
}

/**
 * migrateDemo creates the demo schema and builds it through `demo`, a pool on
 * DEMO_SEARCH_PATH. It refuses a pool that can see public, so the demo
 * migrations can never land in the real schema.
 */
export async function migrateDemo(
  root: Pool,
  demo: Pool,
  log: (line: string) => void = () => undefined,
): Promise<string[]> {
  await root.query("CREATE SCHEMA IF NOT EXISTS demo");
  await assertDemoPath(demo);
  return migrate(
    demo,
    (line) => {
      log(`demo: ${line}`);
    },
    { demo: true },
  );
}

/** assertDemoPath throws unless the pool's connections search demo first and never public. */
export async function assertDemoPath(demo: Pool): Promise<void> {
  const { rows } = await demo.query<{ s: string[] }>("SELECT current_schemas(false)::text[] AS s");
  const schemas = rows[0]?.s ?? [];
  if (schemas[0] !== "demo" || schemas.includes("public")) {
    throw new Error(`the demo pool searches ${schemas.join(", ") || "nothing"}, not demo alone`);
  }
}

if (import.meta.main) {
  const config = loadConfig();
  const pool = createPool(config);
  const demo = createPool({ ...config, DB_POOL_MAX: 1, searchPath: DEMO_SEARCH_PATH });
  const out = (line: string) => process.stdout.write(`${line}\n`);
  try {
    await migrate(pool, out);
    await migrateDemo(pool, demo, out);
  } finally {
    await demo.end();
    await pool.end();
  }
}
