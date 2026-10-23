// Queue names and producer types, independent of any queue system: the
// system itself sits behind the job port (bus.ts, ADR-0032). Payloads carry
// ids only; workers re-read rows (tenet 6).

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
