import { randomUUID } from "node:crypto";

import {
  type Delivery,
  type DeliveryHandler,
  type JobBus,
  type JobEnvelope,
  jobEnvelopeSchema,
} from "../bus.ts";
import type { QueueName } from "../queue.ts";

// The in-memory adapter: the queue port's reference implementation. The
// contract tests run against it without a database, and it shows what any
// adapter (Vercel Queues, Kafka, SQS) has to do. Nothing is durable, so it
// is for tests and local tools, never for a deployment.

export interface MemoryBusOptions {
  now?: () => number;
  /** Retries after the first delivery fails; then the message is dead. */
  retryLimit?: number;
  /** Seconds before the first retry, doubled each time. */
  retryDelaySeconds?: number;
}

interface Entry {
  id: string;
  topic: QueueName;
  payload: unknown;
  attempt: number;
  visibleAt: number;
  priority: number;
  key: string | undefined;
  order: number;
  state: "ready" | "leased" | "done" | "dead";
}

interface Subscription {
  handler: DeliveryHandler;
  concurrency: number;
  inFlight: number;
}

/** memoryBus also lets tests put a raw payload on a topic and read what died. */
export type MemoryBus = JobBus & {
  sendRaw(topic: QueueName, payload: unknown): void;
  dead(topic: QueueName): unknown[];
};

export function memoryBus(options: MemoryBusOptions = {}): MemoryBus {
  const now = options.now ?? Date.now;
  const retryLimit = options.retryLimit ?? 4;
  const retryDelayMs = (options.retryDelaySeconds ?? 0) * 1000;
  const entries: Entry[] = [];
  const subscriptions = new Map<QueueName, Subscription>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let order = 0;
  let stopped = false;

  const add = (topic: QueueName, payload: unknown, delayMs = 0, priority = 0, key?: string) => {
    entries.push({
      id: randomUUID(),
      topic,
      payload,
      attempt: 0,
      visibleAt: now() + delayMs,
      priority,
      key,
      order: order++,
      state: "ready",
    });
  };

  /** Due entries in delivery order: higher priority first, then oldest. */
  const due = (topic: QueueName) =>
    entries
      .filter((e) => e.topic === topic && e.state === "ready" && e.visibleAt <= now())
      .sort((a, b) => b.priority - a.priority || a.order - b.order);

  const fail = (entry: Entry) => {
    entry.attempt += 1;
    if (entry.attempt > retryLimit) {
      entry.state = "dead";
      return;
    }
    entry.state = "ready";
    entry.visibleAt = now() + retryDelayMs * 2 ** (entry.attempt - 1);
    wake(entry.topic, entry.visibleAt);
  };

  /** Leases the next due entry, failing any whose payload is not an envelope. */
  const lease = (topic: QueueName): Delivery | null => {
    for (const entry of due(topic)) {
      const parsed = jobEnvelopeSchema.safeParse(entry.payload);
      if (!parsed.success) {
        entry.state = "dead";
        continue;
      }
      entry.state = "leased";
      return { id: entry.id, attempt: entry.attempt, message: parsed.data };
    }
    return null;
  };

  const find = (topic: QueueName, id: string) => {
    const entry = entries.find((e) => e.topic === topic && e.id === id && e.state === "leased");
    if (!entry) throw new Error(`no leased delivery ${id} on ${topic}`);
    return entry;
  };

  /** Runs due deliveries for a subscribed topic, up to its concurrency. */
  const pump = (topic: QueueName) => {
    const sub = subscriptions.get(topic);
    if (!sub || stopped) return;
    while (sub.inFlight < sub.concurrency) {
      const delivery = lease(topic);
      if (!delivery) return;
      sub.inFlight += 1;
      void sub
        .handler(delivery)
        .then(
          () => {
            find(topic, delivery.id).state = "done";
          },
          () => {
            fail(find(topic, delivery.id));
          },
        )
        .finally(() => {
          sub.inFlight -= 1;
          pump(topic);
        });
    }
  };

  /** Runs the pump again when a delayed entry becomes due. */
  function wake(topic: QueueName, at: number) {
    if (!subscriptions.has(topic)) return;
    const timer = setTimeout(
      () => {
        timers.delete(timer);
        pump(topic);
      },
      Math.max(0, at - now()),
    );
    timer.unref();
    timers.add(timer);
  }

  return {
    name: "memory",
    capabilities: { delivery: "pull", delay: true, priority: true, dedupe: true },
    publish: (topic, message, opts) => {
      const key = opts?.idempotencyKey;
      const pending = entries.some(
        (e) => key !== undefined && e.key === key && (e.state === "ready" || e.state === "leased"),
      );
      if (!pending) {
        const envelope: JobEnvelope = { v: 1, ...message };
        const delayMs = (opts?.delaySeconds ?? 0) * 1000;
        add(topic, envelope, delayMs, opts?.priority ?? 0, key);
        if (delayMs > 0) wake(topic, now() + delayMs);
        else pump(topic);
      }
      return Promise.resolve();
    },
    fetch: (topic, max) => {
      const out: Delivery[] = [];
      for (
        let delivery = lease(topic);
        delivery;
        delivery = out.length < max ? lease(topic) : null
      ) {
        out.push(delivery);
      }
      return Promise.resolve(out);
    },
    // Settling an unknown delivery rejects rather than throwing, like any adapter's network call.
    complete: (topic, id) =>
      Promise.resolve().then(() => {
        find(topic, id).state = "done";
      }),
    fail: (topic, id) =>
      Promise.resolve().then(() => {
        fail(find(topic, id));
      }),
    subscribe: (topic, handler, opts) => {
      subscriptions.set(topic, { handler, concurrency: opts.concurrency, inFlight: 0 });
      pump(topic);
      return Promise.resolve();
    },
    stop: () => {
      stopped = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      return Promise.resolve();
    },
    sendRaw: (topic, payload) => {
      add(topic, payload);
    },
    dead: (topic) =>
      entries.filter((e) => e.topic === topic && e.state === "dead").map((e) => e.payload),
  };
}
