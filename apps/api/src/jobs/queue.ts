import { PgBoss } from "pg-boss";

// pg-boss queues on the same Postgres (ADR-0004). Payloads carry ids only;
// workers re-read rows (tenet 6).

export const QUEUES = { transcribe: "transcribe", score: "score", purge: "purge" } as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export type Enqueue = (
  queue: QueueName,
  data: { callId?: string },
  options?: { startAfterSeconds?: number },
) => Promise<void>;

export const RETRY_LIMIT = 4;

export async function startBoss(connectionString: string, ssl: boolean): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString,
    max: 2,
    ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await boss.start();
  for (const name of Object.values(QUEUES)) {
    await boss.createQueue(`${name}-dead`).catch(() => undefined);
    await boss
      .createQueue(name, {
        retryLimit: name === QUEUES.purge ? 1 : RETRY_LIMIT,
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
    await boss.send(
      queue,
      data,
      options?.startAfterSeconds ? { startAfter: options.startAfterSeconds } : {},
    );
  };
}
