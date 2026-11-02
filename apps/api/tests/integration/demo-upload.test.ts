import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type Fixture,
  resetData,
  resetDemo,
  seedFixture,
  testApp,
  testDemo,
  testDemoPool,
  testPool,
} from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";

// The demo's one upload per device and its daily cap (ADR-0033).

let pool: Pool;
let demo: Pool;
let shadow: Fixture;
let ctx: Awaited<ReturnType<typeof testApp>>;

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
  shadow = await seedFixture(demo);
  ctx = await testApp(pool, { demo: testDemo(demo, { dailyUploads: 3 }) });
});

const browser = {
  platform: "Linux",
  language: "en-IN",
  timeZone: "Asia/Kolkata",
  screen: "1920x1080",
};

/** A new visitor; the same ip and browser make the same device. */
async function visitor(ip = "203.0.113.7", screen = browser.screen) {
  const res = await request(ctx.app)
    .post("/api/demo/sessions")
    .set("x-forwarded-for", ip)
    .send({ ...browser, screen });
  return (res.body as { token: string }).token;
}

const body = (lines = 2, over: Record<string, unknown> = {}) => ({
  transcripts: [
    {
      originalFilename: "my-call.txt",
      agentId: shadow.agentA,
      teamId: shadow.teamId,
      productId: shadow.productId,
      callDate: "2026-10-22",
      lines: Array.from({ length: lines }, (_, i) => ({
        speaker: i % 2 ? "customer" : "agent",
        text: `Line ${String(i)} of the call.`,
      })),
      ...over,
    },
  ],
});

const upload = (token: string, payload: object = body()) =>
  request(ctx.app)
    .post("/api/uploads/transcripts")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

const code = (res: { body: unknown }) => (res.body as { error?: { code: string } }).error?.code;

describe("a demo upload", () => {
  it("is scored like any call, in the demo schema, with its job tagged for the demo", async () => {
    const res = await upload(await visitor());

    expect(res.status).toBe(201);
    const calls = await demo.query("SELECT count(*)::int AS n FROM calls");
    const real = await pool.query("SELECT count(*)::int AS n FROM calls");
    expect([calls.rows[0], real.rows[0]]).toEqual([{ n: 1 }, { n: 0 }]);
    expect(ctx.queue.sent.map((j) => [j.queue, j.workspace])).toEqual([["transcribe", "demo"]]);
    const status = await request(ctx.app).get("/api/demo");
    expect(status.body).toEqual({ enabled: true, uploadsLeftToday: 2 });
  });

  it("is refused a second time from the same device, even as a new visitor", async () => {
    await upload(await visitor());

    const again = await upload(await visitor());
    const otherDevice = await upload(await visitor("203.0.113.7", "390x844"));

    expect([again.status, code(again)]).toEqual([409, "demo_upload_used"]);
    expect(otherDevice.status).toBe(201);
  });

  it("is refused once the day's cap is reached", async () => {
    for (const ip of ["192.0.2.1", "192.0.2.2", "192.0.2.3"]) {
      expect((await upload(await visitor(ip))).status).toBe(201);
    }

    const over = await upload(await visitor("192.0.2.4"));

    expect([over.status, code(over)]).toEqual([429, "demo_busy"]);
    expect((await request(ctx.app).get("/api/demo")).body).toEqual({
      enabled: true,
      uploadsLeftToday: 0,
    });
  });

  it("must be one transcript of at most 200 lines and 20,000 characters", async () => {
    const token = await visitor();
    const two = { transcripts: [...body().transcripts, ...body().transcripts] };
    const long = body(201);
    const wide = body(1, { lines: [{ speaker: "agent", text: "x".repeat(20_001) }] });

    for (const payload of [two, long, wide]) {
      const res = await upload(token, payload);
      expect([res.status, code(res)]).toEqual([422, "demo_upload_too_large"]);
    }
    expect((await upload(token)).status).toBe(201);
  });

  it("gives the upload back when the upload itself fails", async () => {
    const token = await visitor();

    const bad = await upload(token, body(2, { agentId: "00000000-0000-4000-8000-000000000000" }));
    const good = await upload(token);

    expect(bad.status).toBe(400);
    expect(good.status).toBe(201);
    expect((await request(ctx.app).get("/api/demo")).body).toEqual({
      enabled: true,
      uploadsLeftToday: 2,
    });
  });

  it("makes one call when a device sends two uploads at once", async () => {
    const token = await visitor();

    const results = await Promise.all([upload(token), upload(token)]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const calls = await demo.query("SELECT count(*)::int AS n FROM calls");
    expect(calls.rows[0]).toEqual({ n: 1 });
  });
});
