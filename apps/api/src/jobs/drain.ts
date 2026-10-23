import type { Delivery, JobBus } from "./bus.ts";
import { handleScore, handleTranscribe, type JobDeps } from "./handlers.ts";
import { QUEUES } from "./queue.ts";

// The pipeline's jobs, run two ways from the same code (ADR-0020, ADR-0032):
// a long-running worker subscribes through the job port, and on Vercel a
// request drains the queues with drainQueues until its time budget runs out.

export type PipelineQueue = typeof QUEUES.transcribe | typeof QUEUES.score;

/** Transcribe first so a drain moves calls forward in the order they arrived. */
export const PIPELINE_QUEUES: readonly PipelineQueue[] = [QUEUES.transcribe, QUEUES.score];

/** runPipelineJob hands one delivery to its handler; a throw means the queue system retries it. */
export async function runPipelineJob(
  deps: JobDeps,
  queue: PipelineQueue,
  delivery: Delivery,
): Promise<void> {
  const { callId, reschedules } = delivery.message;
  if (!callId) throw new Error(`a ${queue} job needs a callId`);
  const info = { callId, retryCount: delivery.attempt, reschedules: reschedules ?? 0 };
  await (queue === QUEUES.transcribe ? handleTranscribe(deps, info) : handleScore(deps, info));
}

/** The pull half of the job port a drain needs, so tests can drive it without a queue system. */
export type JobSource = Pick<JobBus, "fetch" | "complete" | "fail">;

export interface DrainResult {
  completed: number;
  failed: number;
  /** "empty" when the queues ran dry, "budget" when time ran out first. */
  stoppedBy: "empty" | "budget";
}

/**
 * drainQueues fetches and runs pipeline jobs until the queues are empty or the
 * budget is spent. It only fetches while there is time left, so no job is
 * claimed and then abandoned; a job that outlives the request expires in
 * the queue system and is retried.
 */
export async function drainQueues(
  source: JobSource,
  run: (queue: PipelineQueue, job: Delivery) => Promise<void>,
  options: { budgetMs: number; batchSize?: number; now?: () => number },
): Promise<DrainResult> {
  const now = options.now ?? Date.now;
  const batchSize = options.batchSize ?? 2;
  const deadline = now() + options.budgetMs;
  const result: DrainResult = { completed: 0, failed: 0, stoppedBy: "empty" };
  while (now() < deadline) {
    let fetched = 0;
    for (const queue of PIPELINE_QUEUES) {
      if (now() >= deadline) break;
      const jobs = await source.fetch(queue, batchSize);
      fetched += jobs.length;
      await Promise.all(
        jobs.map(async (job) => {
          try {
            await run(queue, job);
            await source.complete(queue, job.id);
            result.completed++;
          } catch (error) {
            await source.fail(queue, job.id, error instanceof Error ? error.message : "failed");
            result.failed++;
          }
        }),
      );
    }
    if (fetched === 0) return result;
  }
  result.stoppedBy = "budget";
  return result;
}
