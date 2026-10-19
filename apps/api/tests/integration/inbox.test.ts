import { readFile } from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type Fixture,
  insertScoredCall,
  log,
  resetData,
  seedFixture,
  testApp,
  testPool,
} from "./helpers.ts";
import type { Client, Pool } from "../../src/db/pool.ts";
import { evaluateAlerts, sendDigests } from "../../src/jobs/scheduled.ts";
import { notify } from "../../src/repo/inbox.ts";

// Phase C: saved views, the in-app inbox, alert rules and digests (ADR-0025).

let pool: Pool;
let fx: Fixture;
let ctx: Awaited<ReturnType<typeof testApp>>;
const auth = async (sub: string) => ({ Authorization: `Bearer ${await ctx.sign(sub)}` });
const NOW = new Date("2026-10-16T12:00:00Z");

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

describe("saved views", () => {
  it("keeps a view to its owner until it is shared, and only the owner may change it", async () => {
    const qa = await auth(fx.users.qa);
    const manager = await auth(fx.users.manager);
    const made = await request(ctx.app)
      .post("/api/saved-views")
      .set(qa)
      .send({
        page: "calls",
        name: "Flagged Hindi",
        search: { flag: "flagged", language: "hi-IN" },
      })
      .expect(201);
    const id = (made.body as { id: string }).id;

    const hidden = await request(ctx.app).get("/api/saved-views?page=calls").set(manager);
    await request(ctx.app)
      .patch(`/api/saved-views/${id}`)
      .set(qa)
      .send({ shared: true })
      .expect(200);
    const shared = await request(ctx.app).get("/api/saved-views?page=calls").set(manager);
    const notTheirs = await request(ctx.app)
      .patch(`/api/saved-views/${id}`)
      .set(manager)
      .send({ name: "Mine" });
    const notTheirsToDelete = await request(ctx.app).delete(`/api/saved-views/${id}`).set(manager);

    expect((hidden.body as { items: unknown[] }).items).toEqual([]);
    expect((shared.body as { items: { name: string; mine: boolean }[] }).items).toEqual([
      expect.objectContaining({
        name: "Flagged Hindi",
        mine: false,
        search: { flag: "flagged", language: "hi-IN" },
      }),
    ]);
    expect([notTheirs.status, notTheirsToDelete.status]).toEqual([404, 404]);
  });

  it("refuses a view with nested or oversized filters", async () => {
    const res = await request(ctx.app)
      .post("/api/saved-views")
      .set(await auth(fx.users.qa))
      .send({ page: "calls", name: "Odd", search: { q: { nested: true } } });

    expect(res.status).toBe(400);
  });
});

describe("inbox", () => {
  it("shows people only their own notifications, and marks them read", async () => {
    await notify(pool, [fx.users.manager], {
      kind: "alert",
      title: "A",
      body: "",
      link: "/dashboard",
      data: {},
    });
    await notify(pool, [fx.users.manager], {
      kind: "alert",
      title: "B",
      body: "",
      link: null,
      data: {},
    });
    const manager = await auth(fx.users.manager);

    const before = await request(ctx.app).get("/api/notifications/unread-count").set(manager);
    const list = await request(ctx.app).get("/api/notifications").set(manager);
    const first = (list.body as { items: { id: string }[] }).items[0]!.id;
    await request(ctx.app).post(`/api/notifications/${first}/read`).set(manager).expect(204);
    const after = await request(ctx.app).get("/api/notifications/unread-count").set(manager);
    const qaSees = await request(ctx.app)
      .get("/api/notifications")
      .set(await auth(fx.users.qa));
    await request(ctx.app).post("/api/notifications/read-all").set(manager).expect(200);
    const none = await request(ctx.app).get("/api/notifications?unread=true").set(manager);

    expect([before.body, after.body]).toEqual([{ unread: 2 }, { unread: 1 }]);
    expect((qaSees.body as { total: number }).total).toBe(0);
    expect(none.body).toMatchObject({ total: 0, unread: 0 });
  });
});

describe("digests", () => {
  it("sends a due digest once per period, and none once turned off", async () => {
    const manager = await auth(fx.users.manager);
    await insertScoredCall(pool, fx, { callDate: "2026-10-15", needsReview: true, score: 64 });
    await request(ctx.app)
      .put("/api/digest")
      .set(manager)
      .send({ frequency: "weekly" })
      .expect(200);

    const first = await sendDigests({ pool, log }, NOW);
    const again = await sendDigests({ pool, log }, NOW);
    const inbox = await request(ctx.app).get("/api/notifications").set(manager);
    await request(ctx.app).put("/api/digest").set(manager).send({ frequency: "off" }).expect(200);
    const setting = await request(ctx.app).get("/api/digest").set(manager);

    expect([first, again]).toEqual([1, 0]);
    expect((inbox.body as { items: { title: string; body: string }[] }).items[0]).toMatchObject({
      title: "Your weekly digest",
      body: expect.stringContaining("1 calls scored") as string,
    });
    expect(setting.body).toEqual({ frequency: "off" });
  });
});

describe("alerts", () => {
  const rule = (over: Record<string, unknown> = {}) => ({
    name: "Flag rate jump",
    metric: "flag_rate",
    scope: "team",
    thresholdPoints: 50,
    windowDays: 7,
    baselineDays: 28,
    minCalls: 3,
    ...over,
  });
  /** Three clean calls in the baseline, three flagged ones in the window. */
  async function flagRateJumps() {
    for (const day of ["2026-09-20", "2026-09-21", "2026-09-22"]) {
      await insertScoredCall(pool, fx, { callDate: day, needsReview: false, score: 90 });
    }
    for (const day of ["2026-10-13", "2026-10-14", "2026-10-15"]) {
      await insertScoredCall(pool, fx, { callDate: day, needsReview: true, score: 40 });
    }
  }

  it("fires once when a team's flag rate jumps, tells managers, and waits out the cooldown", async () => {
    await flagRateJumps();
    await request(ctx.app)
      .post("/api/alert-rules")
      .set(await auth(fx.users.manager))
      .send(rule())
      .expect(201);
    await request(ctx.app)
      .post("/api/webhooks")
      .set(await auth(fx.users.manager))
      .send({ url: "https://hooks.example.com/a", events: ["alert.triggered"] })
      .expect(201);

    const first = await evaluateAlerts({ pool, log }, NOW);
    const second = await evaluateAlerts({ pool, log }, NOW);
    const inbox = await request(ctx.app)
      .get("/api/notifications")
      .set(await auth(fx.users.manager));
    const firings = await request(ctx.app)
      .get("/api/alert-firings")
      .set(await auth(fx.users.manager));
    const hooks = await pool.query(
      "SELECT 1 FROM webhook_deliveries WHERE event_type = 'alert.triggered'",
    );

    expect([first, second]).toEqual([1, 0]);
    expect((inbox.body as { items: { title: string; body: string }[] }).items[0]).toMatchObject({
      title: "Flag rate jump: Team One",
      body: expect.stringContaining("100%") as string,
    });
    expect(
      (firings.body as { items: { value: number; baseline: number }[] }).items[0],
    ).toMatchObject({
      value: 100,
      baseline: 0,
      calls: 3,
    });
    expect(hooks.rowCount).toBe(1);
  });

  it("treats a falling score as bad news and a rising one as none", async () => {
    await flagRateJumps();
    await request(ctx.app)
      .post("/api/alert-rules")
      .set(await auth(fx.users.manager))
      .send(rule({ name: "Score drop", metric: "avg_score", thresholdPoints: 20 }))
      .expect(201);

    expect(await evaluateAlerts({ pool, log }, NOW)).toBe(1);
  });

  it("does not fire below the minimum calls", async () => {
    await flagRateJumps();
    await request(ctx.app)
      .post("/api/alert-rules")
      .set(await auth(fx.users.manager))
      .send(rule({ minCalls: 10 }))
      .expect(201);

    expect(await evaluateAlerts({ pool, log }, NOW)).toBe(0);
  });

  it("needs a rubric item for an item fail rate, and is for managers only", async () => {
    const manager = await auth(fx.users.manager);

    const noItem = await request(ctx.app)
      .post("/api/alert-rules")
      .set(manager)
      .send(rule({ metric: "item_fail_rate" }));
    const withItem = await request(ctx.app)
      .post("/api/alert-rules")
      .set(manager)
      .send(rule({ metric: "item_fail_rate", itemKey: "consent" }));
    const qa = await request(ctx.app)
      .get("/api/alert-rules")
      .set(await auth(fx.users.qa));

    expect([noItem.status, withItem.status, qa.status]).toEqual([400, 201, 403]);
  });

  it("edits, pauses and deletes a rule", async () => {
    const manager = await auth(fx.users.manager);
    const made = await request(ctx.app)
      .post("/api/alert-rules")
      .set(manager)
      .send(rule())
      .expect(201);
    const id = (made.body as { id: string }).id;

    const paused = await request(ctx.app)
      .put(`/api/alert-rules/${id}`)
      .set(manager)
      .send(rule({ enabled: false, thresholdPoints: 30 }))
      .expect(200);
    await request(ctx.app).delete(`/api/alert-rules/${id}`).set(manager).expect(204);
    const gone = await request(ctx.app).delete(`/api/alert-rules/${id}`).set(manager);

    expect(paused.body).toMatchObject({ enabled: false, thresholdPoints: 30 });
    expect(gone.status).toBe(404);
  });
});

describe("migration 0010", () => {
  it("reverses with its down file and applies again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0010_views_alerts_digests.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0010_views_alerts_digests.sql"), "utf8");
    const tables = async (client: Client) =>
      (
        await client.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables
            WHERE table_name IN ('saved_views', 'notifications', 'alert_rules', 'alert_firings', 'digest_subscriptions')
            ORDER BY 1`,
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

      expect([afterDown.length, afterUp.length]).toEqual([0, 5]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
