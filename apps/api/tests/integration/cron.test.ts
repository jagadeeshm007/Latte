import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { TEST_CRON_SECRET, testApp, testPool } from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";
import { type CronJobs, cronSecretMatches } from "../../src/routes/cron.ts";

// Phase G: the scheduler's endpoints on Vercel (ADR-0020).

let pool: Pool;
beforeAll(async () => {
  pool = await testPool();
});
afterAll(async () => {
  await pool.end();
});

function fakeJobs(): CronJobs {
  return {
    work: vi.fn(() => Promise.resolve({ completed: 2, failed: 0, stoppedBy: "empty" })),
    purge: vi.fn(() => Promise.resolve({ purged: 1, orphans: 0 })),
    alerts: vi.fn(() => Promise.resolve({ fired: 0 })),
    digests: vi.fn(() => Promise.resolve({ sent: 3 })),
    status: vi.fn(() => Promise.resolve({ recorded: true })),
  };
}

describe("cron endpoints", () => {
  it("runs a task for the scheduler's secret and answers its summary", async () => {
    const cron = fakeJobs();
    const { app } = await testApp(pool, { cron });

    const res = await request(app)
      .get("/api/cron/digests")
      .set("Authorization", `Bearer ${TEST_CRON_SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ task: "digests", sent: 3 });
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(cron.digests).toHaveBeenCalledOnce();
  });

  it("refuses a wrong secret without running the task", async () => {
    const cron = fakeJobs();
    const { app } = await testApp(pool, { cron });

    const res = await request(app).get("/api/cron/work").set("Authorization", "Bearer guessed");

    expect(res.status).toBe(401);
    expect(cron.work).not.toHaveBeenCalled();
  });

  it("refuses a user's token, which is not the scheduler's secret", async () => {
    const cron = fakeJobs();
    const { app, sign } = await testApp(pool, { cron });

    const res = await request(app)
      .get("/api/cron/purge")
      .set("Authorization", `Bearer ${await sign("00000000-0000-4000-8000-000000000001")}`);

    expect(res.status).toBe(401);
    expect(cron.purge).not.toHaveBeenCalled();
  });

  it("refuses everything when no secret is configured", async () => {
    const cron = fakeJobs();
    const { app } = await testApp(pool, { cron });
    const base = { AUDIO_RETENTION_DAYS: 90, SIGNED_URL_SECONDS: 600, LLM_BUDGET_USD: 5 };
    const { app: unset } = await testApp(pool, {
      cron,
      config: { ...base, WEB_ORIGIN: "http://localhost:5173" },
    });

    const withSecret = await request(app)
      .get("/api/cron/status")
      .set("Authorization", `Bearer ${TEST_CRON_SECRET}`);
    const without = await request(unset)
      .get("/api/cron/status")
      .set("Authorization", `Bearer ${TEST_CRON_SECRET}`);

    expect(withSecret.status).toBe(200);
    expect(without.status).toBe(401);
  });

  it("leaves /api/cron to the signed-in API where no cron tasks are given", async () => {
    const { app } = await testApp(pool);

    const res = await request(app)
      .get("/api/cron/work")
      .set("Authorization", `Bearer ${TEST_CRON_SECRET}`);

    expect(res.status).toBe(401);
  });
});

describe("cronSecretMatches", () => {
  it("needs the Bearer scheme", () => {
    expect(cronSecretMatches(TEST_CRON_SECRET, TEST_CRON_SECRET)).toBe(false);
  });

  it("accepts the exact secret only", () => {
    expect(cronSecretMatches(`Bearer ${TEST_CRON_SECRET}`, TEST_CRON_SECRET)).toBe(true);
    expect(cronSecretMatches(`Bearer ${TEST_CRON_SECRET}x`, TEST_CRON_SECRET)).toBe(false);
  });
});
