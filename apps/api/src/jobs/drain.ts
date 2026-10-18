import { handleScore, handleTranscribe, type JobDeps } from "./handlers.ts";
import { QUEUES } from "./queue.ts";

// The pipeline's jobs, run two ways from the same code (ADR-0020): the local
// worker subscribes with boss.work, and on Vercel a cron request drains the
// queues with drainQueues until its time budget runs out.

export interface CallJobData {
  callId: string;
  reschedules?: number;
}

/** The fields of a fetched pg-boss job the runners read. */
export interface FetchedJob {
  id: string;
  retryCount: number;
  data: CallJobData;
}

export type PipelineQueue = typeof QUEUES.transcribe | typeof QUEUES.score;

/** Transcribe first so a drain moves calls forward in the order they arrived. */
export const PIPELINE_QUEUES: readonly PipelineQueue[] = [QUEUES.transcribe, QUEUES.score];

/** runPipelineJob hands one fetched job to its handler; a throw means pg-boss retries it. */
export async function runPipelineJob(
  deps: JobDeps,
  queue: PipelineQueue,
  job: FetchedJob,
): Promise<void> {
  const info = {
    callId: job.data.callId,
    retryCount: job.retryCount,
    reschedules: job.data.reschedules ?? 0,
  };
  await (queue === QUEUES.transcribe ? handleTranscribe(deps, info) : handleScore(deps, info));
}

/** The slice of pg-boss a drain needs, so tests can drive it without a database. */
export interface JobSource {
  fetch(queue: PipelineQueue, batchSize: number): Promise<FetchedJob[]>;
  complete(queue: PipelineQueue, id: string): Promise<void>;
  fail(queue: PipelineQueue, id: string, reason: string): Promise<void>;
}

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
 * pg-boss and is retried.
 */
export async function drainQueues(
  source: JobSource,
  run: (queue: PipelineQueue, job: FetchedJob) => Promise<void>,
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
