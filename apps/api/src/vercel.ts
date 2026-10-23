import { getDeadline, waitUntil } from "@vercel/functions";

import { buildApp } from "./app.ts";
import { createAuthAdmin } from "./auth-admin.ts";
import { createVerifier, remoteKeys } from "./auth.ts";
import { jwksUrl } from "./config.ts";
import { backgroundDrain } from "./jobs/background.ts";
import { drainQueues, runPipelineJob } from "./jobs/drain.ts";
import { handlePurge, type JobDeps } from "./jobs/handlers.ts";
import type { Enqueue } from "./jobs/queue.ts";
import { evaluateAlerts, recordStatus, sendDigests } from "./jobs/scheduled.ts";
import { republishWaiting } from "./jobs/sweep.ts";
import type { CronJobs } from "./routes/cron.ts";
import { openServerless } from "./serverless.ts";
import { deliverDue } from "./webhooks/sender.ts";

// The Vercel Function entry point (ADR-0020, ADR-0029): the same Express app
// as server.ts, built once per instance and exported as the request handler.
// With a pull queue (pg-boss), queuing a job starts a drain after the response
// (waitUntil), so a call is processed within seconds of its upload, and
// /api/cron/work, called every minute by Supabase pg_cron, is the backstop for
// retries and anything a drain left behind. With a push queue (Vercel Queues)
// the platform calls the consumer function (vercel-queues.ts) per message, and
// the minute cron sweeps for calls whose publish was lost (ADR-0032).

/** Must match maxDuration in the function's .vc-config.json (scripts/vercel-build.js). */
export const MAX_DURATION_SECONDS = 300;
/** Kept back from the deadline for the job in hand to finish. */
const MARGIN_MS = 60_000;

const { config, log, pool, storage, bus, queue, gateway, webhookDeps } = await openServerless();
const push = bus.capabilities.delivery === "push";

/** Queues a job and, with a pull queue and unless it is meant to wait, starts draining after this response. */
const enqueue: Enqueue = async (name, data, options) => {
  await queue(name, data, options);
  if (!push && !options?.startAfterSeconds) kick();
};
const jobDeps: JobDeps = { pool, storage, gateway, enqueue, log };

const kick = backgroundDrain({
  drain: async (budgetMs) => {
    if (push) {
      const swept = await republishWaiting({ pool, bus, log });
      return { ...swept, delivered: await deliverDue(webhookDeps) };
    }
    // Move expired and retryable jobs along, as a long-lived worker's supervisor would.
    await bus.maintain?.();
    const drained = await drainQueues(bus, (name, job) => runPipelineJob(jobDeps, name, job), {
      budgetMs,
    });
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
