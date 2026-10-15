import { readFileSync } from "node:fs";

import { databaseUrl, loadConfig, sslOptions } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { handlePurge, handleScore, handleTranscribe, type JobDeps } from "./jobs/handlers.ts";
import { bossEnqueue, QUEUES, startBoss } from "./jobs/queue.ts";
import { createLogger } from "./logger.ts";
import { createStorage } from "./storage.ts";
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
await boss.work<{ callId: string; reschedules?: number }>(
  QUEUES.transcribe,
  work,
  async ([job]) => {
    if (job)
      await handleTranscribe(deps, {
        callId: job.data.callId,
        retryCount: job.retryCount,
        reschedules: job.data.reschedules ?? 0,
      });
  },
);
await boss.work<{ callId: string; reschedules?: number }>(QUEUES.score, work, async ([job]) => {
  if (job)
    await handleScore(deps, {
      callId: job.data.callId,
      retryCount: job.retryCount,
      reschedules: job.data.reschedules ?? 0,
    });
});
await boss.work(QUEUES.purge, async () => {
  await handlePurge(deps);
});
await boss.schedule(QUEUES.purge, "15 2 * * *");
log.info({ concurrency: config.WORKER_CONCURRENCY, mode: config.MODEL_MODE }, "worker started");

let closing = false;
async function shutdown(reason: string): Promise<void> {
  if (closing) return;
  closing = true;
  log.info({ reason }, "worker shutting down");
  setTimeout(() => process.exit(1), 30_000).unref();
  await boss.stop({ graceful: true, timeout: 25_000 }).catch(() => undefined);
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
