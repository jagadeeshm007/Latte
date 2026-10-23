import { z } from "zod";

import type { Enqueue, QueueName } from "./queue.ts";

// The queue port (ADR-0032). Every queue system (pg-boss today, Vercel
// Queues on Vercel, Kafka, SQS or RabbitMQ later) is an adapter that
// implements JobBus and passes the shared contract tests in
// bus.contract.ts. Nothing outside src/jobs/adapters imports a queue library.

/**
 * The job envelope: ids only, so a worker re-reads the rows it needs (tenet 6),
 * and a version so old and new deployments can tell payloads apart. Jobs
 * queued before the envelope had a version carry none and read as version 1.
 */
export const jobEnvelopeSchema = z.object({
  v: z.literal(1).default(1),
  callId: z.string().min(1).optional(),
  reschedules: z.number().int().min(0).optional(),
});
export type JobEnvelope = z.output<typeof jobEnvelopeSchema>;
/** What a producer publishes; the bus adds the version. */
export type JobMessage = Omit<JobEnvelope, "v">;

/** readEnvelope parses a payload as the current envelope; one no version understands is an error. */
export function readEnvelope(raw: unknown): JobEnvelope {
  return jobEnvelopeSchema.parse(raw);
}

export interface PublishOptions {
  /** Not delivered before this many seconds. */
  delaySeconds?: number;
  /** Higher first, where the system supports it (capabilities.priority). */
  priority?: number;
  /** A second publish with the same key is dropped, where the system supports it (capabilities.dedupe). */
  idempotencyKey?: string;
}

/** What an adapter does natively. The pipeline works without priority and dedupe; delay is required. */
export interface Capabilities {
  delay: boolean;
  priority: boolean;
  dedupe: boolean;
}

/** One delivery of a message. */
export interface Delivery {
  id: string;
  /** Earlier deliveries of this message: 0 the first time. */
  attempt: number;
  message: JobEnvelope;
}

export type DeliveryHandler = (delivery: Delivery) => Promise<void>;

export interface JobBus {
  readonly name: string;
  readonly capabilities: Capabilities;
  publish(topic: QueueName, message: JobMessage, options?: PublishOptions): Promise<void>;
  /** Pull: up to `max` deliveries that are due, leased to the caller until completed or failed. */
  fetch(topic: QueueName, max: number): Promise<Delivery[]>;
  /** The delivery was handled and is not delivered again. */
  complete(topic: QueueName, id: string): Promise<void>;
  /** The delivery failed: it is retried after a backoff until the topic's attempts run out. */
  fail(topic: QueueName, id: string, reason: string): Promise<void>;
  /** Long-running consumers: hands deliveries to `handler`, at most `concurrency` at once; a throw fails it. */
  subscribe(
    topic: QueueName,
    handler: DeliveryHandler,
    options: { concurrency: number },
  ): Promise<void>;
  /** Moves expired and due-for-retry deliveries along, for systems that need a sweep (pg-boss on serverless). */
  maintain?(): Promise<void>;
  stop(): Promise<void>;
}

/** Cron-triggered tasks. Kept apart from JobBus: a queue system is not asked to be a scheduler (ADR-0032). */
export interface Scheduler {
  schedule(topic: QueueName, cron: string, task: () => Promise<unknown>): Promise<void>;
}

/** enqueueVia: the Enqueue callers already use, over any bus. */
export function enqueueVia(bus: Pick<JobBus, "publish">): Enqueue {
  return async (queue, data, options) => {
    await bus.publish(queue, data, {
      ...(options?.startAfterSeconds ? { delaySeconds: options.startAfterSeconds } : {}),
      ...(options?.priority === undefined ? {} : { priority: options.priority }),
    });
  };
}
