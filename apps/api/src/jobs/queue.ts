import { PgBoss } from "pg-boss";

import type { CallJobData, JobSource } from "./drain.ts";

// pg-boss queues on the same Postgres (ADR-0004). Payloads carry ids only;
// workers re-read rows (tenet 6).

export const QUEUES = {
  transcribe: "transcribe",
  score: "score",
  purge: "purge",
  alerts: "alerts",
  digests: "digests",
  status: "status",
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export type Enqueue = (
  queue: QueueName,
  data: { callId?: string; reschedules?: number },
  options?: { startAfterSeconds?: number; priority?: number },
) => Promise<void>;

/** Higher runs first: a one-off upload is not stuck behind a large batch. */
export const PRIORITY = { interactive: 10, bulk: 0 } as const;

export const RETRY_LIMIT = 4;

/**
 * startBoss connects pg-boss and makes sure every queue exists. A serverless
 * instance passes maintenance: false: it neither supervises nor runs schedules,
 * because Vercel Cron does both from outside (ADR-0020).
 */
export async function startBoss(
  connectionString: string,
  ssl: { ca: string; rejectUnauthorized: true } | { rejectUnauthorized: false } | undefined,
  options: { maintenance?: boolean; max?: number } = {},
): Promise<PgBoss> {
  const maintenance = options.maintenance ?? true;
  const boss = new PgBoss({
    connectionString,
    max: options.max ?? 2,
    ...(ssl ? { ssl } : {}),
    ...(maintenance ? {} : { supervise: false, schedule: false }),
  });
  await boss.start();
  for (const name of Object.values(QUEUES)) {
    await boss.createQueue(`${name}-dead`).catch(() => undefined);
    await boss
      .createQueue(name, {
        retryLimit: name === QUEUES.transcribe || name === QUEUES.score ? RETRY_LIMIT : 1,
        retryDelay: 30,
        retryBackoff: true,
        expireInSeconds: 15 * 60,
        deadLetter: `${name}-dead`,
      })
      .catch(() => undefined);
  }
  return boss;
}

export function bossEnqueue(boss: PgBoss): Enqueue {
  return async (queue, data, options) => {
    await boss.send(queue, data, {
      ...(options?.startAfterSeconds ? { startAfter: options.startAfterSeconds } : {}),
      ...(options?.priority === undefined ? {} : { priority: options.priority }),
    });
  };
}

/** bossJobSource adapts pg-boss to the drain loop's fetch, complete and fail. */
export function bossJobSource(boss: PgBoss): JobSource {
  return {
    fetch: async (queue, batchSize) => {
      const jobs = await boss.fetch<CallJobData>(queue, { batchSize, includeMetadata: true });
      return jobs.map((j) => ({ id: j.id, retryCount: j.retryCount, data: j.data }));
    },
    complete: async (queue, id) => {
      await boss.complete(queue, id);
    },
    fail: async (queue, id, reason) => {
      await boss.fail(queue, id, { reason });
    },
  };
}
