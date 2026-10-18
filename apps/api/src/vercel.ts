import { readFileSync } from "node:fs";
import path from "node:path";

import { buildApp } from "./app.ts";
import { createAuthAdmin } from "./auth-admin.ts";
import { createVerifier, remoteKeys } from "./auth.ts";
import { databaseUrl, loadConfig, jwksUrl, sslOptions } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { drainQueues, runPipelineJob } from "./jobs/drain.ts";
import { handlePurge, type JobDeps } from "./jobs/handlers.ts";
import { bossEnqueue, bossJobSource, startBoss } from "./jobs/queue.ts";
import { evaluateAlerts, recordStatus, sendDigests } from "./jobs/scheduled.ts";
import { createLogger } from "./logger.ts";
import type { CronJobs } from "./routes/cron.ts";
import { createStorage } from "./storage.ts";
import { deliverDue } from "./webhooks/sender.ts";
import { buildGateway } from "./wiring.ts";

// The Vercel Function entry point (ADR-0020): the same Express app as
// server.ts, built once per instance and exported as the request handler.
// pg-boss runs without supervision or schedules here; Vercel Cron calls
// /api/cron/* instead, and the work task drains the queues within its budget.

/** Must match maxDuration in the function's .vc-config.json (scripts/vercel-build.js). */
export const MAX_DURATION_SECONDS = 300;
/** Leave a minute for the job in hand to finish and the response to go out. */
const WORK_BUDGET_MS = (MAX_DURATION_SECONDS - 60) * 1000;

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
const enqueue = bossEnqueue(boss);
const jobDeps: JobDeps = {
  pool,
  storage,
  gateway: buildGateway(config, pool),
  enqueue,
  log,
};
const webhookDeps = { pool, log, encryptionKey: config.DATA_ENCRYPTION_KEY };

const cron: CronJobs = {
  work: async () => {
    // Move expired and retryable jobs along, as a long-lived worker's supervisor would.
    await boss.supervise();
    const drained = await drainQueues(
      bossJobSource(boss),
      (queue, job) => runPipelineJob(jobDeps, queue, job),
      { budgetMs: WORK_BUDGET_MS },
    );
    const delivered = await deliverDue(webhookDeps);
    return { ...drained, delivered };
  },
  purge: async () => handlePurge(jobDeps),
  alerts: async () => ({ fired: await evaluateAlerts(jobDeps) }),
  digests: async () => ({ sent: await sendDigests(jobDeps) }),
  status: async () => {
    await recordStatus({ pool, log, storage });
    return { recorded: true };
  },
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
