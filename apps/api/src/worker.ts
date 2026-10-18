import { readFileSync } from "node:fs";

import { databaseUrl, loadConfig, sslOptions } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { type CallJobData, PIPELINE_QUEUES, runPipelineJob } from "./jobs/drain.ts";
import { handlePurge, type JobDeps } from "./jobs/handlers.ts";
import { bossEnqueue, QUEUES, startBoss } from "./jobs/queue.ts";
import { evaluateAlerts, recordStatus, sendDigests } from "./jobs/scheduled.ts";
import { createLogger } from "./logger.ts";
import { createStorage } from "./storage.ts";
import { deliverDue } from "./webhooks/sender.ts";
import { buildGateway } from "./wiring.ts";

// The background worker: transcribe, score and the daily purge (ADR-0004).
// Concurrency is the lever against provider rate limits (HLD section 8).
const config = loadConfig();
const log = createLogger(config);
const pool = createPool(config);
const boss = await startBoss(
  databaseUrl(config),
  sslOptions(config, (p) => readFileSync(p, "utf8")),
);
const deps: JobDeps = {
  pool,
  storage: createStorage(config),
  gateway: buildGateway(config, pool),
  enqueue: bossEnqueue(boss),
  log,
};

const work = {
  localConcurrency: config.WORKER_CONCURRENCY,
  batchSize: 1,
  includeMetadata: true,
} as const;
for (const queue of PIPELINE_QUEUES) {
  await boss.work<CallJobData>(queue, work, async ([job]) => {
    if (job) await runPipelineJob(deps, queue, job);
  });
}
await boss.work(QUEUES.purge, async () => {
  await handlePurge(deps);
});
await boss.schedule(QUEUES.purge, "15 2 * * *");
// Alerts and digests are checked hourly; each digest decides whether it is due.
await boss.work(QUEUES.alerts, async () => {
  await evaluateAlerts(deps);
});
await boss.work(QUEUES.digests, async () => {
  await sendDigests(deps);
});
await boss.schedule(QUEUES.alerts, "5 * * * *");
await boss.schedule(QUEUES.digests, "10 * * * *");
await boss.work(QUEUES.status, async () => {
  await recordStatus(deps);
});
await boss.schedule(QUEUES.status, "*/5 * * * *");
// The webhook outbox is polled rather than queued: a delivery row is the job (ADR-0021).
const WEBHOOK_POLL_MS = 15_000;
let sending = false;
const webhookTimer = setInterval(() => {
  if (sending) return;
  sending = true;
  deliverDue({ pool, log, encryptionKey: config.DATA_ENCRYPTION_KEY })
    .catch((error: unknown) => {
      log.error({ err: error }, "webhook delivery pass failed");
    })
    .finally(() => {
      sending = false;
    });
}, WEBHOOK_POLL_MS);

log.info({ concurrency: config.WORKER_CONCURRENCY, mode: config.MODEL_MODE }, "worker started");

let closing = false;
async function shutdown(reason: string): Promise<void> {
  if (closing) return;
  closing = true;
  log.info({ reason }, "worker shutting down");
  clearInterval(webhookTimer);
  setTimeout(() => process.exit(1), 30_000).unref();
  await boss.stop({ graceful: true, timeout: 25_000 }).catch(() => undefined);
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
