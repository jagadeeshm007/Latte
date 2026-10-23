import { loadConfig } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { openJobSystem } from "./jobs/adapters/index.ts";
import { enqueueVia } from "./jobs/bus.ts";
import { PIPELINE_QUEUES, runPipelineJob } from "./jobs/drain.ts";
import { handlePurge, type JobDeps } from "./jobs/handlers.ts";
import { QUEUES } from "./jobs/queue.ts";
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
const { bus, scheduler } = await openJobSystem(config);
if (!scheduler)
  throw new Error(`the ${config.JOB_QUEUE} job system has no scheduler for the worker`);
const deps: JobDeps = {
  pool,
  storage: createStorage(config),
  gateway: buildGateway(config, pool),
  enqueue: enqueueVia(bus),
  log,
};

for (const queue of PIPELINE_QUEUES) {
  await bus.subscribe(queue, (delivery) => runPipelineJob(deps, queue, delivery), {
    concurrency: config.WORKER_CONCURRENCY,
  });
}
await scheduler.schedule(QUEUES.purge, "15 2 * * *", () => handlePurge(deps));
// Alerts and digests are checked hourly; each digest decides whether it is due.
await scheduler.schedule(QUEUES.alerts, "5 * * * *", () => evaluateAlerts(deps));
await scheduler.schedule(QUEUES.digests, "10 * * * *", () => sendDigests(deps));
await scheduler.schedule(QUEUES.status, "*/5 * * * *", () => recordStatus(deps));
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

log.info(
  { concurrency: config.WORKER_CONCURRENCY, mode: config.MODEL_MODE, queue: bus.name },
  "worker started",
);

let closing = false;
async function shutdown(reason: string): Promise<void> {
  if (closing) return;
  closing = true;
  log.info({ reason }, "worker shutting down");
  clearInterval(webhookTimer);
  setTimeout(() => process.exit(1), 30_000).unref();
  await bus.stop().catch(() => undefined);
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
