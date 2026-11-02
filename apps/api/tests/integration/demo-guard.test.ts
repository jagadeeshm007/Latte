import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type Fixture,
  insertScoredCall,
  resetData,
  resetDemo,
  seedFixture,
  testApp,
  testDemo,
  testDemoPool,
  testPool,
} from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";

// What a demo visitor may do (ADR-0033): an allowlist over the same routes,
// all of them served from the demo schema.

let pool: Pool;
let demo: Pool;
let real: Fixture;
let shadow: Fixture;
let app: Awaited<ReturnType<typeof testApp>>["app"];

const MARKER = "REAL-CUSTOMER-MARKER";

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
  real = await seedFixture(pool);
  shadow = await seedFixture(demo);
  await pool.query("UPDATE teams SET name = $1", [MARKER]);
  await pool.query("UPDATE profiles SET display_name = $1", [MARKER]);
  await insertScoredCall(pool, real, {
    callDate: "2026-10-20",
    needsReview: true,
    filename: `${MARKER}.wav`,
  });
  ({ app } = await testApp(pool, { demo: testDemo(demo) }));
});

async function visitor(ip = "203.0.113.7") {
  const res = await request(app)
    .post("/api/demo/sessions")
    .set("x-forwarded-for", ip)
    .send({ platform: "Linux" });
  const { token } = res.body as { token: string };
  const me = await request(app).get("/api/me").set("Authorization", `Bearer ${token}`);
  return { token, id: (me.body as { id: string }).id };
}

const as = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Every route the API declares, read from the route files so a new one is swept too. */
async function declaredRoutes(): Promise<{ method: string; path: string }[]> {
  const dir = path.resolve(import.meta.dirname, "../../src/routes");
  const routes: { method: string; path: string }[] = [];
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".ts") || file === "cron.ts") continue;
    const text = await readFile(path.join(dir, file), "utf8");
    for (const m of text.matchAll(/router\.(get|post|put|patch|delete)\(\s*[`"]([^`"]+)[`"]/g)) {
      const raw = m[2] ?? "";
      const paths = raw.includes("${path}")
        ? ["archive", "unarchive"].map((p) => raw.replace("${path}", p))
        : [raw];
      for (const p of paths) routes.push({ method: (m[1] ?? "").toUpperCase(), path: p });
    }
  }
  return routes;
}

const ALLOWED_READS = [
  "/me",
  "/reference",
  "/calls",
  "/calls/:id",
  "/review/queue",
  "/scorecard/:id",
  "/agreement",
  "/dashboard",
  "/dashboard/leaderboard",
  "/dashboard/highlights",
  "/rubrics/active",
  "/rubrics",
  "/alert-rules",
  "/alert-firings",
  "/teams",
  "/saved-views?page=calls",
  "/notifications",
  "/notifications/unread-count",
  "/usage",
  "/usage/history",
];

describe("the demo allowlist", () => {
  it("refuses the admin and account routes with demo_forbidden", async () => {
    const { token } = await visitor();
    const blocked: [string, string][] = [
      ["GET", "/members"],
      ["POST", "/members"],
      ["GET", "/api-keys"],
      ["POST", "/api-keys"],
      ["GET", "/webhooks"],
      ["GET", "/billing/prices"],
      ["GET", "/billing/statement"],
      ["GET", "/batches"],
      ["POST", "/status/notices"],
      ["PATCH", "/me"],
      ["POST", "/rubrics"],
      ["POST", "/alert-rules"],
      ["PUT", "/digest"],
      ["POST", "/uploads/sign"],
      ["POST", "/uploads/confirm"],
    ];

    for (const [method, url] of blocked) {
      const res = await request(app)
        [method.toLowerCase() as "get"](`/api${url}`)
        .set(as(token))
        .send({});
      expect([
        method,
        url,
        res.status,
        (res.body as { error?: { code: string } }).error?.code,
      ]).toEqual([method, url, 403, "demo_forbidden"]);
    }
  });

  it("serves every allowed read", async () => {
    const { token } = await visitor();
    const callId = await insertScoredCall(demo, shadow, { callDate: "2026-10-21" });
    const ids: Record<string, string> = { "/calls/:id": callId, "/scorecard/:id": shadow.agentA };

    for (const route of ALLOWED_READS) {
      const url = route.includes(":id") ? route.replace(":id", ids[route] ?? "") : route;
      const res = await request(app).get(`/api${url}`).set(as(token));
      expect([route, res.status]).toEqual([route, 200]);
    }
  });

  it("decides every declared route and never returns real data", async () => {
    const { token } = await visitor();
    const realCall = (await pool.query<{ id: string }>("SELECT id FROM calls")).rows[0]!.id;
    const decided: string[] = [];

    for (const route of await declaredRoutes()) {
      const url = `/api${route.path.replace(/:\w+/g, realCall)}`;
      const res = await request(app)
        [route.method.toLowerCase() as "get"](url)
        .set(as(token))
        .send({});
      expect(JSON.stringify(res.body) + res.text).not.toContain(MARKER);
      expect(res.status).not.toBe(500);
      decided.push(`${route.method} ${route.path} ${String(res.status)}`);
    }
    expect(decided.length).toBeGreaterThan(60);
  });

  it("refuses review actions, which belong to QA reviewers, on every call", async () => {
    const mine = await visitor();
    const own = await insertScoredCall(demo, shadow, {
      callDate: "2026-10-21",
      needsReview: true,
      uploadedBy: mine.id,
    });

    const complete = await request(app)
      .post(`/api/calls/${own}/review/complete`)
      .set(as(mine.token))
      .send({});
    const add = await request(app).post(`/api/calls/${own}/findings`).set(as(mine.token)).send({});

    expect([complete.status, add.status]).toEqual([403, 403]);
  });

  it("hides another visitor's call from the list, the detail and the review queue", async () => {
    const first = await visitor("203.0.113.7");
    const second = await visitor("198.51.100.9");
    const theirs = await insertScoredCall(demo, shadow, {
      callDate: "2026-10-21",
      needsReview: true,
      uploadedBy: first.id,
      filename: "first-visitor.txt",
    });
    const seeded = await insertScoredCall(demo, shadow, {
      callDate: "2026-10-21",
      needsReview: true,
    });

    const list = await request(app).get("/api/calls").set(as(second.token));
    const detail = await request(app).get(`/api/calls/${theirs}`).set(as(second.token));
    const queue = await request(app).get("/api/review/queue").set(as(second.token));
    const ownerSees = await request(app).get(`/api/calls/${theirs}`).set(as(first.token));

    const ids = (body: unknown) => (body as { items: { id: string }[] }).items.map((i) => i.id);
    expect(ids(list.body)).toEqual([seeded]);
    expect(detail.status).toBe(404);
    expect(ids(queue.body)).toEqual([seeded]);
    expect(ownerSees.status).toBe(200);
  });

  it("leaves real users with every route they had", async () => {
    const ctx = await testApp(pool, { demo: testDemo(demo) });
    const res = await request(ctx.app)
      .get("/api/members")
      .set("Authorization", `Bearer ${await ctx.sign(real.users.manager)}`);

    expect(res.status).toBe(200);
  });
});
