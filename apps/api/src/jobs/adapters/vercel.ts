import type { MessageMetadata, QueueClient, RetryHandler } from "@vercel/queue";
import type { Logger } from "pino";

import { type Delivery, type JobBus, type JobEnvelope, jobEnvelopeSchema } from "../bus.ts";
import type { QueueName } from "../queue.ts";

// The Vercel Queues adapter (ADR-0032). Publishing goes through @vercel/queue's
// client. Delivery is push: Vercel calls the consumer function (src/vercel-queues.ts)
// once per message, at most the trigger's maxConcurrency at a time, so this
// bus has no fetch or subscribe. The function's trigger is written by
// scripts/vercel-build.js; delivery is at least once, and a second delivery
// finds its call already claimed (claimCall).

export type QueueSenderClient = Pick<QueueClient, "send">;
/** The Node callback route handler the client returns. */
export type NodeCallback = ReturnType<QueueClient["handleNodeCallback"]>;
/** The part of the client a consumer uses, with the payload left unknown until it is parsed. */
export interface QueueConsumerClient {
  handleNodeCallback(
    handler: (payload: unknown, metadata: MessageMetadata) => Promise<void>,
    options?: { retry?: RetryHandler },
  ): NodeCallback;
}

/** The first retry waits this long; each later one doubles it, as pg-boss's backoff does. */
const RETRY_DELAY_SECONDS = 30;
const MAX_RETRY_DELAY_SECONDS = 3600;

const PUSH_ONLY =
  "Vercel Queues pushes each message to the consumer function; there is nothing to fetch or subscribe to";

/** retryAfterSeconds is the wait before redelivering a message that failed `attempt` earlier times plus this one. */
export function retryAfterSeconds(attempt: number): number {
  return Math.min(RETRY_DELAY_SECONDS * 2 ** attempt, MAX_RETRY_DELAY_SECONDS);
}

/** vercelQueuesBus adapts Vercel Queues to the queue port for publishing. */
export function vercelQueuesBus(client: QueueSenderClient): JobBus {
  const pushOnly = () => Promise.reject(new Error(PUSH_ONLY));
  return {
    name: "vercel",
    // No priority: an interactive upload waits behind a batch in the same topic.
    capabilities: { delivery: "push", delay: true, priority: false, dedupe: true },
    publish: async (topic, message, options) => {
      const envelope: JobEnvelope = { v: 1, ...message };
      await client.send(topic, envelope, {
        ...(options?.delaySeconds ? { delaySeconds: options.delaySeconds } : {}),
        ...(options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
      });
    },
    fetch: pushOnly,
    complete: pushOnly,
    fail: pushOnly,
    subscribe: pushOnly,
    stop: () => Promise.resolve(),
  };
}

/**
 * vercelPushConsumer is the request handler for the consumer function: it
 * reads each pushed message as an envelope and hands it to `handle`. A
 * payload no version understands, or a topic not in `topics`, is
 * acknowledged and logged, never retried; a throw from `handle` is
 * redelivered after the backoff.
 */
export function vercelPushConsumer<T extends QueueName>(
  client: QueueConsumerClient,
  topics: readonly T[],
  handle: (topic: T, delivery: Delivery) => Promise<void>,
  log: Pick<Logger, "error">,
): NodeCallback {
  return client.handleNodeCallback(
    async (payload, metadata) => {
      const { messageId, topicName } = metadata;
      const parsed = jobEnvelopeSchema.safeParse(payload);
      const topic = topics.find((t) => t === topicName);
      if (!parsed.success || topic === undefined) {
        log.error(
          { messageId, topic: topicName },
          "queue message dropped: not an envelope for this consumer",
        );
        return;
      }
      await handle(topic, {
        id: messageId,
        attempt: metadata.deliveryCount - 1,
        message: parsed.data,
      });
    },
    {
      retry: (_error, metadata) => ({
        afterSeconds: retryAfterSeconds(metadata.deliveryCount - 1),
      }),
    },
  );
}

/** The parts of node:http's IncomingMessage the consumer reads. */
export type CallbackRequest = AsyncIterable<Buffer | string> & {
  method?: string | undefined;
  headers: Record<string, string | string[] | undefined>;
};

/** The parts of node:http's ServerResponse the consumer writes. */
export interface BareResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(chunk?: string): unknown;
}

/**
 * readCallbackBody reads a callback request's body the way the client's Node
 * handler expects it already parsed: JSON as a value, anything else as bytes.
 */
export async function readCallbackBody(req: CallbackRequest): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req)
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  const body = Buffer.concat(chunks);
  const type = req.headers["content-type"];
  const isJson = (Array.isArray(type) ? type[0] : type)?.includes("json") ?? false;
  return isJson ? (JSON.parse(body.toString("utf8")) as unknown) : body;
}

/**
 * nodeFunctionHandler turns the client's callback into a plain Node handler
 * for a Vercel Function: it reads the body the callback expects parsed and
 * answers through the bare ServerResponse (shouldAddHelpers is off).
 */
export function nodeFunctionHandler(
  callback: NodeCallback,
): (req: CallbackRequest, res: BareResponse) => Promise<void> {
  return async (req, res) => {
    const body = req.method === "POST" ? await readCallbackBody(req) : undefined;
    const reply = (code: number) => {
      res.statusCode = code;
      return {
        json: (data: unknown) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        },
        end: () => res.end(),
      };
    };
    await callback(
      { headers: req.headers, body, ...(req.method ? { method: req.method } : {}) },
      { status: reply, end: () => res.end() },
    );
  };
}
