import type { Logger } from "pino";

import type { JobBus } from "./bus.ts";
import { QUEUES } from "./queue.ts";
import type { Pool } from "../db/pool.ts";
import { listWaitingCalls } from "../repo/calls.ts";

// The backstop for push delivery (ADR-0032). A call is saved and then its job
// is published; a publish that fails after the save leaves the call waiting,
// and with Vercel Queues no drain looks at the database to notice. The
// minute cron runs this sweep instead of a drain.

/** Longer than a publish takes, shorter than anyone waits for a score. */
export const WAITING_SECONDS = 10 * 60;
/** Bounds one sweep; the next minute's sweep takes the rest. */
const SWEEP_LIMIT = 100;

export interface SweepDeps {
  pool: Pool;
  bus: Pick<JobBus, "publish">;
  log: Pick<Logger, "info">;
}

/**
 * republishWaiting publishes the next step again for calls waiting longer than
 * WAITING_SECONDS. The idempotency key names the call, the step and when the
 * call last moved, so a sweep a minute later is dropped by the queue system
 * and a call that has moved on gets a new key.
 */
export async function republishWaiting(deps: SweepDeps): Promise<{ republished: number }> {
  const waiting = await listWaitingCalls(deps.pool, WAITING_SECONDS, SWEEP_LIMIT);
  for (const call of waiting) {
    const topic = call.status === "uploaded" ? QUEUES.transcribe : QUEUES.score;
    await deps.bus.publish(
      topic,
      { callId: call.id },
      { idempotencyKey: `${call.id}:${topic}:${call.since}` },
    );
  }
  if (waiting.length > 0)
    deps.log.info({ republished: waiting.length }, "sweep republished waiting calls");
  return { republished: waiting.length };
}
