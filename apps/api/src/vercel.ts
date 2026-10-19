import { readFileSync } from "node:fs";
import path from "node:path";

import { attachDatabasePool, getDeadline, waitUntil } from "@vercel/functions";

import { buildApp } from "./app.ts";
import { createAuthAdmin } from "./auth-admin.ts";
import { createVerifier, remoteKeys } from "./auth.ts";
import { databaseUrl, loadConfig, jwksUrl, sslOptions } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { backgroundDrain } from "./jobs/background.ts";
import { drainQueues, runPipelineJob } from "./jobs/drain.ts";
import { handlePurge, type JobDeps } from "./jobs/handlers.ts";
import { bossEnqueue, bossJobSource, type Enqueue, startBoss } from "./jobs/queue.ts";
import { evaluateAlerts, recordStatus, sendDigests } from "./jobs/scheduled.ts";
import { createLogger } from "./logger.ts";
import type { CronJobs } from "./routes/cron.ts";
import { createStorage } from "./storage.ts";
import { deliverDue } from "./webhooks/sender.ts";
import { buildGateway } from "./wiring.ts";

// The Vercel Function entry point (ADR-0020, ADR-0029): the same Express app
// as server.ts, built once per instance and exported as the request handler.
// pg-boss runs without supervision or schedules here. Queuing a job starts a
// drain after the response (waitUntil), so a call is processed within seconds
// of its upload; /api/cron/*, called every minute by Supabase pg_cron, is the
// backstop for retries and anything a drain left behind.

/** Must match maxDuration in the function's .vc-config.json (scripts/vercel-build.js). */
export const MAX_DURATION_SECONDS = 300;
/** Kept back from the deadline for the job in hand to finish. */
const MARGIN_MS = 60_000;

const loaded = loadConfig();
// The build ships the database CA beside the bundle; a relative path means "next to this file".
const config = {
  ...loaded,
  DB_SSL_CA: loaded.DB_SSL_CA && path.resolve(import.meta.dirname, loaded.DB_SSL_CA),
};
const log = createLogger(config);
const pool = createPool(config);
const storage = createStorage(config);
const boss = await startBoss(
  databaseUrl(config),
  sslOptions(config, (p) => readFileSync(p, "utf8")),
  { maintenance: false, max: 1 },
);
// Idle connections are closed before Vercel suspends the instance.
attachDatabasePool(pool);

const queue = bossEnqueue(boss);
/** Queues a job and, unless it is meant to wait, starts draining after this response. */
const enqueue: Enqueue = async (name, data, options) => {
  await queue(name, data, options);
  if (!options?.startAfterSeconds) kick();
};
const jobDeps: JobDeps = {
  pool,
  storage,
  gateway: buildGateway(config, pool),
  enqueue,
  log,
};
const webhookDeps = { pool, log, encryptionKey: config.DATA_ENCRYPTION_KEY };

const kick = backgroundDrain({
  drain: async (budgetMs) => {
    // Move expired and retryable jobs along, as a long-lived worker's supervisor would.
    await boss.supervise();
    const drained = await drainQueues(
      bossJobSource(boss),
      (name, job) => runPipelineJob(jobDeps, name, job),
      { budgetMs },
    );
    const delivered = await deliverDue(webhookDeps);
    return { ...drained, delivered };
  },
  waitUntil,
  deadline: getDeadline,
  fallbackBudgetMs: (MAX_DURATION_SECONDS - 60) * 1000,
  marginMs: MARGIN_MS,
  log,
});

/**
 * Runs a scheduled task after the response: pg_net gives up on a request
 * after a few seconds, and the task must not stop with it.
 */
function inBackground(task: string, run: () => Promise<Record<string, unknown>>) {
  return () => {
    waitUntil(
      run()
        .then((summary) => {
          log.info({ task, ...summary }, "scheduled task finished");
        })
        .catch((error: unknown) => {
          log.error({ err: error, task }, "scheduled task failed");
        }),
    );
    return Promise.resolve({ started: true });
  };
}

const cron: CronJobs = {
  work: () => {
    kick();
    return Promise.resolve({ started: true });
  },
  purge: inBackground("purge", () => handlePurge(jobDeps)),
  alerts: inBackground("alerts", async () => ({ fired: await evaluateAlerts(jobDeps) })),
  digests: inBackground("digests", async () => ({ sent: await sendDigests(jobDeps) })),
  status: inBackground("status", async () => {
    await recordStatus({ pool, log, storage });
    return { recorded: true };
  }),
};

const app = buildApp({
  config,
  pool,
  storage,
  enqueue,
  verify: createVerifier(remoteKeys(jwksUrl(config)), config.SUPABASE_URL),
  log,
  authAdmin: createAuthAdmin(config),
  cron,
});

export default app;
