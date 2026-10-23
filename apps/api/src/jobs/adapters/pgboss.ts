import { PgBoss } from "pg-boss";

import {
  type Delivery,
  type JobBus,
  type JobEnvelope,
  jobEnvelopeSchema,
  type Scheduler,
} from "../bus.ts";
import { QUEUES, RETRY_LIMIT } from "../queue.ts";

// The pg-boss adapter (ADR-0004, ADR-0032): queues on the same Postgres.
// Locally the worker subscribes; on Vercel a drain fetches within its time
// budget and calls maintain() first, because no supervisor runs there.

export interface BossOptions {
  /** false on serverless: it neither supervises nor runs schedules (ADR-0020). */
  maintenance?: boolean;
  /** Pool size; 1 on serverless. */
  max?: number;
  /** Seconds before the first retry, doubled each time. */
  retryDelaySeconds?: number;
  /** Postgres schema for pg-boss's tables; the contract tests use their own. */
  schema?: string;
}

type Ssl = { ca: string; rejectUnauthorized: true } | { rejectUnauthorized: false } | undefined;

/** startBoss connects pg-boss and makes sure every queue exists. */
export async function startBoss(
  connectionString: string,
  ssl: Ssl,
  options: BossOptions = {},
): Promise<PgBoss> {
  const maintenance = options.maintenance ?? true;
  const retryDelaySeconds = options.retryDelaySeconds ?? 30;
  const boss = new PgBoss({
    connectionString,
    max: options.max ?? 2,
    ...(options.schema ? { schema: options.schema } : {}),
    ...(ssl ? { ssl } : {}),
    ...(maintenance ? {} : { supervise: false, schedule: false }),
  });
  await boss.start();
  for (const name of Object.values(QUEUES)) {
    const dead = `${name}-dead`;
    if (!(await boss.getQueue(dead))) await boss.createQueue(dead);
    const settings = {
      retryLimit: name === QUEUES.transcribe || name === QUEUES.score ? RETRY_LIMIT : 1,
      retryDelay: retryDelaySeconds,
      // Backoff would raise a 0 s delay to 1 s; 0 (the contract tests) means retry at once.
      retryBackoff: retryDelaySeconds > 0,
      expireInSeconds: 15 * 60,
      deadLetter: dead,
    };
    // SCC-4-1: an existing queue is updated too; creating it only once left changed settings unapplied.
    if (await boss.getQueue(name)) await boss.updateQueue(name, settings);
    else await boss.createQueue(name, settings);
  }
  return boss;
}

const NOT_AN_ENVELOPE = "the job's payload is not a known envelope";

/** A job read as the current envelope, or null when its payload does not parse. */
function toDelivery(job: { id: string; retryCount: number; data: unknown }): Delivery | null {
  const parsed = jobEnvelopeSchema.safeParse(job.data);
  return parsed.success ? { id: job.id, attempt: job.retryCount, message: parsed.data } : null;
}

/** pgBossBus adapts pg-boss to the queue port. */
export function pgBossBus(boss: PgBoss): JobBus {
  return {
    name: "pgboss",
    // Latte's queues use pg-boss's standard policy, where singletonKey does not de-duplicate;
    // the pipeline does not need it, because a second delivery finds its call already claimed.
    capabilities: { delay: true, priority: true, dedupe: false },
    publish: async (topic, message, options) => {
      const envelope: JobEnvelope = { v: 1, ...message };
      await boss.send(topic, envelope, {
        ...(options?.delaySeconds ? { startAfter: options.delaySeconds } : {}),
        ...(options?.priority === undefined ? {} : { priority: options.priority }),
      });
    },
    fetch: async (topic, max) => {
      const jobs = await boss.fetch<unknown>(topic, { batchSize: max, includeMetadata: true });
      const deliveries: Delivery[] = [];
      for (const job of jobs) {
        const delivery = toDelivery(job);
        // A payload no handler can read is failed with its reason instead of reaching one.
        if (delivery) deliveries.push(delivery);
        else await boss.fail(topic, job.id, { reason: NOT_AN_ENVELOPE });
      }
      return deliveries;
    },
    complete: async (topic, id) => {
      await boss.complete(topic, id);
    },
    fail: async (topic, id, reason) => {
      await boss.fail(topic, id, { reason });
    },
    subscribe: async (topic, handler, options) => {
      const work = { localConcurrency: options.concurrency, batchSize: 1, includeMetadata: true };
      await boss.work<unknown>(topic, work, async ([job]) => {
        if (!job) return;
        const delivery = toDelivery(job);
        // A throw makes pg-boss fail the job (and retry it); returning would complete it.
        if (!delivery) throw new Error(NOT_AN_ENVELOPE);
        await handler(delivery);
      });
    },
    maintain: async () => {
      await boss.supervise();
    },
    stop: async () => {
      await boss.stop({ graceful: true, timeout: 25_000 });
    },
  };
}

/** pgBossScheduler runs cron tasks through pg-boss's own scheduler (the local worker). */
export function pgBossScheduler(boss: PgBoss): Scheduler {
  return {
    schedule: async (topic, cron, task) => {
      await boss.work(topic, async () => {
        await task();
      });
      await boss.schedule(topic, cron);
    },
  };
}
