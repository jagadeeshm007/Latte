import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { testDemoPool, testPool } from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";

// The demo schema (ADR-0033): every table the app has, built by the same
// migrations, on a connection that cannot see the real tables.

let pool: Pool;
let demo: Pool;

beforeAll(async () => {
  pool = await testPool();
  demo = await testDemoPool(pool);
});
afterAll(async () => {
  await demo.end();
  await pool.end();
});

const columns = async (schema: string) =>
  (
    await pool.query<{ table_name: string; column_name: string }>(
      `SELECT c.table_name, c.column_name FROM information_schema.columns c
       JOIN information_schema.tables t USING (table_schema, table_name)
       WHERE c.table_schema = $1 AND t.table_type = 'BASE TABLE'
       ORDER BY 1, 2`,
      [schema],
    )
  ).rows.map((r) => `${r.table_name}.${r.column_name}`);

describe("the demo schema", () => {
  it("has every table and column the real schema has", async () => {
    const real = await columns("public");
    const shadow = new Set(await columns("demo"));

    expect(real.length).toBeGreaterThan(100);
    expect(real.filter((c) => !shadow.has(c))).toEqual([]);
  });

  it("adds the demo-only tables in demo and nowhere else", async () => {
    const { rows } = await pool.query<{ table_schema: string; table_name: string }>(
      `SELECT table_schema, table_name FROM information_schema.tables
       WHERE table_name IN ('visitors', 'device_uploads', 'daily_uploads', 'session_starts')
       ORDER BY 2`,
    );

    expect(rows.map((r) => `${r.table_schema}.${r.table_name}`)).toEqual([
      "demo.daily_uploads",
      "demo.device_uploads",
      "demo.session_starts",
      "demo.visitors",
    ]);
  });

  it("never puts public on a demo connection's path, even after a failed query", async () => {
    const client = await demo.connect();
    try {
      await expect(client.query("SELECT * FROM no_such_table")).rejects.toThrow();
      const { rows } = await client.query<{ s: string[] }>(
        "SELECT current_schemas(false)::text[] AS s",
      );
      expect(rows[0]?.s).not.toContain("public");
      expect(rows[0]?.s[0]).toBe("demo");
    } finally {
      client.release();
    }
  });

  it("fails a query on a table that exists only in public instead of reading it", async () => {
    await pool.query("CREATE TABLE public.only_real (id int)");
    try {
      await expect(demo.query("SELECT * FROM only_real")).rejects.toThrow(/does not exist/);
    } finally {
      await pool.query("DROP TABLE public.only_real");
    }
  });

  it("keeps real and demo rows apart", async () => {
    await pool.query("INSERT INTO teams (name) VALUES ('Real team')");
    await demo.query("INSERT INTO teams (name) VALUES ('Demo team')");

    const real = await pool.query<{ name: string }>("SELECT name FROM teams");
    const shadow = await demo.query<{ name: string }>("SELECT name FROM teams");

    expect(real.rows.map((r) => r.name)).toEqual(["Real team"]);
    expect(shadow.rows.map((r) => r.name)).toEqual(["Demo team"]);
  });
});
