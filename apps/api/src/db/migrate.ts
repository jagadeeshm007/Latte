// Applies src/db/migrations/*.sql in name order, each in its own transaction,
// recording what ran in schema_migrations. A migration applied anywhere is
// never edited; a change is a new file. Run: pnpm --filter @scc/api migrate
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../config.ts";
import { createPool, inTransaction, type Pool } from "./pool.ts";

const DIR = path.join(import.meta.dirname, "migrations");

export async function migrate(pool: Pool, log: (line: string) => void = () => undefined): Promise<string[]> {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  await pool.query("ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY");
  const done = new Set(
    (await pool.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name),
  );
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();
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

if (import.meta.main) {
  const pool = createPool(loadConfig());
  try {
    await migrate(pool, (line) => process.stdout.write(`${line}\n`));
  } finally {
    await pool.end();
  }
}
