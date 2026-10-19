import { readFile } from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type Fixture,
  insertScoredCall,
  log,
  MemoryStorage,
  resetData,
  seedFixture,
  testApp,
  testPool,
} from "./helpers.ts";
import type { Client, Pool } from "../../src/db/pool.ts";
import { recordStatus } from "../../src/jobs/scheduled.ts";

// Phase F: usage statements and the public status page (ADR-0026).

let pool: Pool;
let fx: Fixture;
let ctx: Awaited<ReturnType<typeof testApp>>;
const auth = async (sub: string) => ({ Authorization: `Bearer ${await ctx.sign(sub)}` });

beforeAll(async () => {
  pool = await testPool();
});
afterAll(async () => {
  await pool.end();
});
beforeEach(async () => {
  await resetData(pool);
  fx = await seedFixture(pool);
  ctx = await testApp(pool);
});

/** A scored call whose score and model spend fall on the given day. */
async function billedCall(day: string, durationMs: number, costUsd: number) {
  const id = await insertScoredCall(pool, fx, { callDate: day });
  await pool.query("UPDATE calls SET duration_ms = $2 WHERE id = $1", [id, durationMs]);
  await pool.query(
    "UPDATE scores SET created_at = $2::date + interval '12 hours' WHERE call_id = $1",
    [id, day],
  );
  await pool.query(
    `INSERT INTO model_calls (provider, model, kind, purpose, call_id, status, cost_usd, created_at)
     VALUES ('groq', 'm', 'chat', 'score', $1, 'ok', $2, $3::date + interval '12 hours'),
            ('groq', 'm', 'chat', 'score', $1, 'error', 9, $3::date + interval '12 hours')`,
    [id, costUsd, day],
  );
  return id;
}

describe("usage statements", () => {
  it("prices a month's calls, audio and model spend from the price list", async () => {
    await billedCall("2026-10-03", 60_000, 0.25);
    await billedCall("2026-10-20", 120_000, 0.25);
    await billedCall("2026-11-02", 600_000, 5);

    const res = await request(ctx.app)
      .get("/api/billing/statement?month=2026-10")
      .set(await auth(fx.users.manager))
      .expect(200);

    // Defaults: INR, 88 per USD, 5 a call, 1 a minute, model spend plus 20%.
    expect(res.body).toMatchObject({
      from: "2026-10-01",
      to: "2026-10-31",
      lines: [
        { label: "Calls scored", quantity: 2, amount: 10 },
        { label: "Audio processed", quantity: 3, amount: 3 },
        { quantity: 0.5, unitPrice: 105.6, amount: 52.8 },
      ],
      total: 65.8,
      byTeam: [{ name: "Team One", calls: 2, audioMinutes: 3, modelCostUsd: 0.5 }],
      byApiKey: [{ name: "In the app", calls: 2 }],
    });
  });

  it("changes the price list for managers, within its limits", async () => {
    const manager = await auth(fx.users.manager);
    const prices = {
      currency: "USD",
      usdRate: 1,
      perCall: 0.1,
      perAudioMinute: 0.02,
      modelMarkupPct: 0,
    };

    const saved = await request(ctx.app)
      .put("/api/billing/prices")
      .set(manager)
      .send(prices)
      .expect(200);
    const bad = await request(ctx.app)
      .put("/api/billing/prices")
      .set(manager)
      .send({ ...prices, currency: "dollars" });
    const qa = await request(ctx.app)
      .get("/api/billing/statement?month=2026-10")
      .set(await auth(fx.users.qa));

    expect(saved.body).toEqual(prices);
    expect([bad.status, qa.status]).toEqual([400, 403]);
  });
});

describe("status page", () => {
  it("answers anyone, signed in or not, with every component and 90 days of history", async () => {
    const res = await request(ctx.app).get("/api/status").expect(200);

    const body = res.body as {
      overall: string;
      components: { component: string; ok: boolean; history: unknown[] }[];
    };
    expect(body.overall).toBe("operational");
    expect(body.components.map((c) => [c.component, c.ok])).toEqual([
      ["api", true],
      ["database", true],
      ["storage", true],
      ["processing", true],
      ["models", true],
    ]);
    expect(body.components[0]!.history).toHaveLength(90);
  });

  it("reports processing as degraded when a queued call has waited too long", async () => {
    const id = await insertScoredCall(pool, fx, { callDate: "2026-10-01" });
    await pool.query(
      "UPDATE calls SET status = 'uploaded', updated_at = now() - interval '2 hours' WHERE id = $1",
      [id],
    );

    const res = await request(ctx.app).get("/api/status").expect(200);

    const body = res.body as {
      overall: string;
      components: { component: string; ok: boolean; detail: string }[];
    };
    expect(body.overall).toBe("degraded");
    expect(body.components.find((c) => c.component === "processing")).toMatchObject({
      ok: false,
      detail: expect.stringContaining("120 minutes") as string,
    });
  });

  // SCC-1: a failing probe's raw error (hosts, addresses) reached the public page.
  it("never shows a failing probe's raw error on the public page", async () => {
    const storage = new MemoryStorage();
    storage.exists = () => Promise.reject(new Error("connect ECONNREFUSED 10.1.2.3:443"));
    const broken = await testApp(pool, { storage });

    const res = await request(broken.app).get("/api/status").expect(200);

    const body = res.body as { components: { component: string; ok: boolean; detail: string }[] };
    expect(body.components.find((c) => c.component === "storage")).toMatchObject({
      ok: false,
      detail: "not responding",
    });
    expect(JSON.stringify(res.body)).not.toContain("10.1.2.3");
  });

  it("shows a manager's outage notice until it is resolved", async () => {
    const manager = await auth(fx.users.manager);
    const posted = await request(ctx.app)
      .post("/api/status/notices")
      .set(manager)
      .send({ title: "Transcription delayed", severity: "outage" })
      .expect(201);
    const fresh = await testApp(pool);

    const during = await request(fresh.app).get("/api/status");
    await request(ctx.app)
      .post(`/api/status/notices/${(posted.body as { id: string }).id}/resolve`)
      .set(manager)
      .expect(204);
    const after = await request((await testApp(pool)).app).get("/api/status");

    expect(during.body).toMatchObject({
      overall: "outage",
      notices: [{ title: "Transcription delayed", resolvedAt: null }],
    });
    expect(after.body).toMatchObject({ overall: "operational" });
    await request(ctx.app)
      .post("/api/status/notices")
      .set(await auth(fx.users.qa))
      .send({ title: "x", severity: "info" })
      .expect(403);
  });

  it("records checks for the uptime history", async () => {
    await recordStatus({ pool, storage: ctx.storage, log });

    const res = await request(ctx.app).get("/api/status").expect(200);

    const history = (res.body as { components: { history: { uptime: number | null }[] }[] })
      .components[0]!.history;
    expect(history.at(-1)).toMatchObject({ uptime: 1 });
    expect(history.at(-2)).toMatchObject({ uptime: null });
  });
});

describe("migration 0013", () => {
  it("reverses with its down file and applies again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0013_billing_status.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0013_billing_status.sql"), "utf8");
    const tables = async (client: Client) =>
      (
        await client.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables
            WHERE table_name IN ('billing_prices', 'status_checks', 'status_notices') ORDER BY 1`,
        )
      ).rows.map((r) => r.table_name);
    const client = await pool.connect();
    try {
      // DDL is transactional in Postgres: roll back so the shared test schema is untouched.
      await client.query("BEGIN");

      await client.query(down);
      const afterDown = await tables(client);
      await client.query(up);
      const afterUp = await tables(client);

      expect([afterDown, afterUp]).toEqual([
        [],
        ["billing_prices", "status_checks", "status_notices"],
      ]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
