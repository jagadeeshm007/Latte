import type { PgBoss } from "pg-boss";
import { afterAll, describe, expect, it } from "vitest";

import { testPool } from "./helpers.ts";
import { openJobSystem } from "../../src/jobs/adapters/index.ts";
import { pgBossBus, startBoss } from "../../src/jobs/adapters/pgboss.ts";
import { busContract } from "../../src/jobs/bus.contract.ts";
import { QUEUES, RETRY_LIMIT } from "../../src/jobs/queue.ts";

// pg-boss against the queue port's contract (ADR-0032), on the test Postgres
// in its own schema so it never touches another test's jobs. The retry delay
// is 0 so a retry is due at once; production keeps its 30 s backoff.

const url =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/scc_test";

let boss: PgBoss | undefined;

busContract(
  "pg-boss",
  async () => {
    boss ??= await startBoss(url, undefined, { retryDelaySeconds: 0, schema: "pgboss_contract" });
    const b = boss;
    const bus = pgBossBus(b);
    return {
      bus,
      sendRaw: async (topic, payload) => {
        await b.send(topic, payload as object);
      },
      reset: async () => {
        for (const name of Object.values(QUEUES)) await b.offWork(name).catch(() => undefined);
        await b.deleteAllJobs();
      },
      close: async () => {
        for (const name of Object.values(QUEUES)) await b.offWork(name).catch(() => undefined);
      },
    };
  },
  {
    retryLimit: RETRY_LIMIT,
    capabilities: { delivery: "pull", delay: true, priority: true, dedupe: false },
    deliveryTimeoutMs: 10_000,
  },
);

afterAll(async () => {
  await boss?.stop({ graceful: false });
});

describe("startBoss", () => {
  // SCC-4-1: queues were only ever created, so a changed retry setting never reached an existing queue.
  it("applies changed settings to a queue that already exists", async () => {
    const pool = await testPool();
    await pool.query("DROP SCHEMA IF EXISTS pgboss_settings CASCADE");
    await pool.end();
    const first = await startBoss(url, undefined, {
      retryDelaySeconds: 30,
      schema: "pgboss_settings",
    });
    await first.stop({ graceful: false });

    const second = await startBoss(url, undefined, {
      retryDelaySeconds: 5,
      schema: "pgboss_settings",
    });
    const queue = await second.getQueue(QUEUES.score);
    await second.stop({ graceful: false });

    expect(queue).toMatchObject({ retryDelay: 5, retryLimit: RETRY_LIMIT });
  });
});

describe("openJobSystem", () => {
  const config = {
    JOB_QUEUE: "pgboss" as const,
    DATABASE_URL: url,
    SUPABASE_POOLER_HOST: "aws-0-ap-south-1.pooler.supabase.com",
    DB_SSL: false,
  };

  it("opens the configured adapter with a scheduler for a long-running worker and none on serverless", async () => {
    const worker = await openJobSystem(config);
    const serverless = await openJobSystem(config, { serverless: true });
    await worker.bus.stop();
    await serverless.bus.stop();

    expect([worker.bus.name, worker.scheduler === null]).toEqual(["pgboss", false]);
    expect([serverless.bus.name, serverless.scheduler, typeof serverless.bus.maintain]).toEqual([
      "pgboss",
      null,
      "function",
    ]);
  });

  it("registers a scheduled task with pg-boss's cron", async () => {
    const { bus, scheduler } = await openJobSystem(config);

    await scheduler?.schedule(QUEUES.status, "*/5 * * * *", () => Promise.resolve());
    const boss = await startBoss(url, undefined);
    const schedules = await boss.getSchedules();
    await boss.stop({ graceful: false });
    await bus.stop();

    expect(schedules.map((s) => [s.name, s.cron])).toContainEqual([QUEUES.status, "*/5 * * * *"]);
  });
});
