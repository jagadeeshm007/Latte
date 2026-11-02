import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  resetData,
  resetDemo,
  seedFixture,
  testApp,
  testDemo,
  testDemoPool,
  testPool,
} from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";
import { DEMO_TOKEN_PREFIX } from "../../src/demo/keys.ts";

// Starting a demo session and signing in with it (ADR-0033).

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
beforeEach(async () => {
  await resetData(pool);
  await resetDemo(demo);
});

const browser = {
  platform: "Linux",
  language: "en-IN",
  timeZone: "Asia/Kolkata",
  screen: "1920x1080",
};

async function start(app: Parameters<typeof request>[0], ip = "203.0.113.7") {
  return request(app)
    .post("/api/demo/sessions")
    .set("x-forwarded-for", ip)
    .set("user-agent", "Mozilla/5.0 (X11; Linux x86_64)")
    .send(browser);
}

describe("with demo mode off", () => {
  it("says so, refuses to start a session and refuses demo tokens", async () => {
    const { app } = await testApp(pool);

    const status = await request(app).get("/api/demo");
    const started = await start(app);
    const me = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${DEMO_TOKEN_PREFIX}abc`);

    expect(status.status).toBe(200);
    expect(status.body).toEqual({ enabled: false });
    expect(started.status).toBe(404);
    expect(me.status).toBe(401);
  });
});

describe("with demo mode on", () => {
  it("reports how many uploads are left today", async () => {
    const { app } = await testApp(pool, { demo: testDemo(demo, { dailyUploads: 7 }) });

    const status = await request(app).get("/api/demo");

    expect(status.body).toEqual({ enabled: true, uploadsLeftToday: 7 });
  });

  it("starts a session as a throwaway manager kept only in the demo schema", async () => {
    const { app } = await testApp(pool, { demo: testDemo(demo) });

    const started = await start(app);
    const body = started.body as { token: string; expiresAt: string };
    const me = await request(app).get("/api/me").set("Authorization", `Bearer ${body.token}`);

    expect(started.status).toBe(201);
    expect(body.token.startsWith(DEMO_TOKEN_PREFIX)).toBe(true);
    expect(new Date(body.expiresAt).getTime() - Date.now()).toBeGreaterThan(23 * 3600 * 1000);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ displayName: "Demo visitor", role: "manager", agentId: null });
    const real = await pool.query("SELECT count(*)::int AS n FROM profiles");
    const shadow = await demo.query("SELECT count(*)::int AS n FROM visitors");
    expect([real.rows[0], shadow.rows[0]]).toEqual([{ n: 0 }, { n: 1 }]);
  });

  it("stores a hash of the device, never the IP or the browser", async () => {
    const { app } = await testApp(pool, { demo: testDemo(demo) });

    await start(app, "198.51.100.23");

    const { rows } = await demo.query<{ row: string }>(
      "SELECT row_to_json(v)::text AS row FROM visitors v UNION ALL SELECT row_to_json(s)::text FROM session_starts s",
    );
    const stored = rows.map((r) => r.row).join(" ");
    expect(stored).toMatch(/"fingerprint_hash":"[0-9a-f]{64}"/);
    for (const raw of ["198.51.100.23", "Mozilla", "Asia/Kolkata", "1920x1080", "Linux"]) {
      expect(stored).not.toContain(raw);
    }
  });

  it("allows five sessions an hour from one IP", async () => {
    const { app } = await testApp(pool, { demo: testDemo(demo) });

    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await start(app)).status);
    const elsewhere = await start(app, "192.0.2.1");

    expect(codes).toEqual([201, 201, 201, 201, 201, 429]);
    expect(elsewhere.status).toBe(201);
  });

  it("refuses a token once its visitor has expired or been removed", async () => {
    const { app } = await testApp(pool, { demo: testDemo(demo) });
    const { token } = (await start(app)).body as { token: string };

    await demo.query("UPDATE visitors SET expires_at = now() - interval '1 minute'");
    const expired = await request(app).get("/api/me").set("Authorization", `Bearer ${token}`);

    expect(expired.status).toBe(401);
  });

  it("refuses a demo token signed by another deployment", async () => {
    const { app } = await testApp(pool, { demo: testDemo(demo) });
    const other = await testApp(pool, { demo: testDemo(demo, { secret: "o".repeat(32) }) });
    const { token } = (await start(other.app)).body as { token: string };

    const me = await request(app).get("/api/me").set("Authorization", `Bearer ${token}`);

    expect(me.status).toBe(401);
  });

  it("still serves real users from the real schema", async () => {
    const fx = await seedFixture(pool);
    const ctx = await testApp(pool, { demo: testDemo(demo) });

    const me = await request(ctx.app)
      .get("/api/me")
      .set("Authorization", `Bearer ${await ctx.sign(fx.users.manager)}`);

    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: fx.users.manager, role: "manager" });
  });
});
