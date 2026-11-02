import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { recordingQueue, resetData, resetDemo, testDemoPool, testPool } from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";
import { DEMO_OWNER_ID, seedDemo } from "../../src/demo/seed.ts";

// The demo seed (ADR-0033): the scripted calls, loaded into the demo schema
// and queued for the real pipeline.

let pool: Pool;
let demo: Pool;
const SCRIPTS = path.resolve(import.meta.dirname, "../../../../evals/calls");

beforeAll(async () => {
  pool = await testPool();
  demo = await testDemoPool(pool);
});
afterAll(async () => {
  await demo.end();
  await pool.end();
});
beforeEach(async () => {
  await resetData(pool);
  await resetDemo(demo);
});

describe("seedDemo", () => {
  it("refuses a pool that can see the real schema", async () => {
    await expect(
      seedDemo({ pool, enqueue: recordingQueue().enqueue }, { scripts: SCRIPTS }),
    ).rejects.toThrow(/not demo alone/);
    const real = await pool.query("SELECT count(*)::int AS n FROM teams");
    expect(real.rows[0]).toEqual({ n: 0 });
  });

  it("loads every script as a call owned by the demo team and queues it for the demo", async () => {
    const queue = recordingQueue();

    const result = await seedDemo(
      { pool: demo, enqueue: queue.enqueue },
      { scripts: SCRIPTS, today: new Date("2026-11-02T00:00:00Z") },
    );

    expect(result).toEqual({ added: 22, existing: 0 });
    const calls = await demo.query<{
      uploaded_by: string;
      input: string;
      first: string;
      last: string;
    }>(
      `SELECT uploaded_by::text, input, min(call_date)::text AS first, max(call_date)::text AS last
         FROM calls GROUP BY 1, 2`,
    );
    expect(calls.rows).toEqual([
      { uploaded_by: DEMO_OWNER_ID, input: "transcript", first: "2026-10-03", last: "2026-11-02" },
    ]);
    expect(queue.sent).toHaveLength(22);
    expect(new Set(queue.sent.map((j) => j.queue))).toEqual(new Set(["transcribe"]));
    const retention = await demo.query<{ ok: boolean }>(
      "SELECT bool_and(retention_until > current_date + 3650) AS ok FROM calls",
    );
    expect(retention.rows[0]?.ok).toBe(true);
    const real = await pool.query("SELECT count(*)::int AS n FROM calls");
    expect(real.rows[0]).toEqual({ n: 0 });
  });

  it("adds only what is missing when run again", async () => {
    const deps = { pool: demo, enqueue: recordingQueue().enqueue };
    await seedDemo(deps, { scripts: SCRIPTS });
    await demo.query("DELETE FROM calls WHERE original_filename = '05-clean-term-en.txt'");

    const again = await seedDemo(deps, { scripts: SCRIPTS });

    expect(again).toEqual({ added: 1, existing: 21 });
  });
});
