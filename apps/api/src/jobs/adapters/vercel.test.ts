import { Readable } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import { QUEUES } from "../queue.ts";
import { openJobSystem } from "./index.ts";
import {
  type QueueConsumerClient,
  type QueueSenderClient,
  readCallbackBody,
  retryAfterSeconds,
  vercelPushConsumer,
  vercelQueuesBus,
} from "./vercel.ts";

// The Vercel Queues adapter against a stand-in for @vercel/queue's client:
// what it sends, and how a push delivery reaches the pipeline and comes back
// as a retry decision. The platform itself is not called from tests.

type Handler = Parameters<QueueConsumerClient["handleNodeCallback"]>[0];
type Options = NonNullable<Parameters<QueueConsumerClient["handleNodeCallback"]>[1]>;
type Metadata = Parameters<Handler>[1];

function fakeSender() {
  const sent: { topic: string; payload: unknown; options: unknown }[] = [];
  const client: QueueSenderClient = {
    send: (topic, payload, options) => {
      sent.push({ topic, payload, options });
      return Promise.resolve({ messageId: `m${String(sent.length)}` });
    },
  };
  return { client, sent };
}

function fakeConsumer() {
  const captured: { handler?: Handler; options?: Options | undefined } = {};
  const client: QueueConsumerClient = {
    handleNodeCallback: (handler, options) => {
      captured.handler = handler;
      captured.options = options;
      return () => Promise.resolve();
    },
  };
  return { client, captured };
}

const log = { error: vi.fn() };
const TOPICS = [QUEUES.transcribe, QUEUES.score];

function metadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    messageId: "msg-1",
    deliveryCount: 1,
    createdAt: new Date(0),
    expiresAt: new Date(0),
    topicName: QUEUES.transcribe,
    consumerGroup: "default",
    region: "bom1",
    ...overrides,
  };
}

describe("vercelQueuesBus", () => {
  it("publishes a version 1 envelope with the delay and idempotency key", async () => {
    const { client, sent } = fakeSender();
    const bus = vercelQueuesBus(client);

    await bus.publish(
      QUEUES.score,
      { callId: "c1", reschedules: 1 },
      { delaySeconds: 42, idempotencyKey: "c1:score", priority: 10 },
    );

    expect(sent).toEqual([
      {
        topic: "score",
        payload: { v: 1, callId: "c1", reschedules: 1 },
        options: { delaySeconds: 42, idempotencyKey: "c1:score" },
      },
    ]);
  });

  it("publishes an immediate message with no options", async () => {
    const { client, sent } = fakeSender();

    await vercelQueuesBus(client).publish(QUEUES.transcribe, { callId: "c2" });

    expect(sent[0]?.options).toEqual({});
  });

  it("declares push delivery with delay and dedupe but no priority", () => {
    const bus = vercelQueuesBus(fakeSender().client);

    expect([bus.name, bus.capabilities]).toEqual([
      "vercel",
      { delivery: "push", delay: true, priority: false, dedupe: true },
    ]);
  });

  it("refuses pull calls, because the platform pushes each message to a function", async () => {
    const bus = vercelQueuesBus(fakeSender().client);

    await expect(bus.fetch(QUEUES.transcribe, 1)).rejects.toThrow(/push/);
    await expect(
      bus.subscribe(QUEUES.transcribe, () => Promise.resolve(), { concurrency: 1 }),
    ).rejects.toThrow(/push/);
  });
});

describe("vercelPushConsumer", () => {
  it("hands the pipeline the topic and a delivery whose attempt counts earlier deliveries", async () => {
    const { client, captured } = fakeConsumer();
    const handle = vi.fn(() => Promise.resolve());
    vercelPushConsumer(client, TOPICS, handle, log);

    await captured.handler?.(
      { v: 1, callId: "c3" },
      metadata({ deliveryCount: 3, topicName: "score" }),
    );

    expect(handle).toHaveBeenCalledWith("score", {
      id: "msg-1",
      attempt: 2,
      message: { v: 1, callId: "c3" },
    });
  });

  it("acknowledges a payload no version understands instead of retrying it", async () => {
    const { client, captured } = fakeConsumer();
    const handle = vi.fn(() => Promise.resolve());
    vercelPushConsumer(client, TOPICS, handle, log);

    await captured.handler?.({ v: 99 }, metadata());

    expect(handle).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalled();
  });

  it("acknowledges a topic it was not given", async () => {
    const { client, captured } = fakeConsumer();
    const handle = vi.fn(() => Promise.resolve());
    vercelPushConsumer(client, TOPICS, handle, log);

    await captured.handler?.({ v: 1, callId: "c4" }, metadata({ topicName: "purge" }));

    expect(handle).not.toHaveBeenCalled();
  });

  it("lets a failure through so the platform redelivers it after the backoff", async () => {
    const { client, captured } = fakeConsumer();
    vercelPushConsumer(client, TOPICS, () => Promise.reject(new Error("boom")), log);

    const run = captured.handler?.({ v: 1, callId: "c5" }, metadata());
    const decision = captured.options?.retry?.(new Error("boom"), metadata({ deliveryCount: 2 }));

    await expect(run).rejects.toThrow("boom");
    expect(decision).toEqual({ afterSeconds: 60 });
  });
});

describe("retryAfterSeconds", () => {
  it("doubles from 30 s per earlier delivery and stops at an hour", () => {
    const delays = [0, 1, 2, 3, 10].map(retryAfterSeconds);

    expect(delays).toEqual([30, 60, 120, 240, 3600]);
  });
});

describe("readCallbackBody", () => {
  it("parses a JSON callback body", async () => {
    const req = Object.assign(
      Readable.from([Buffer.from('{"v":1,'), Buffer.from('"callId":"c6"}')]),
      {
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );

    expect(await readCallbackBody(req)).toEqual({ v: 1, callId: "c6" });
  });

  it("keeps any other body as bytes", async () => {
    const req = Object.assign(Readable.from([Buffer.from("raw")]), {
      headers: { "content-type": "application/octet-stream" },
    });

    expect(await readCallbackBody(req)).toEqual(Buffer.from("raw"));
  });
});

describe("openJobSystem with JOB_QUEUE=vercel", () => {
  it("opens the Vercel Queues bus with no scheduler, since pg_cron runs the schedules", async () => {
    vi.stubEnv("VERCEL_REGION", "bom1");

    const { bus, scheduler } = await openJobSystem({
      JOB_QUEUE: "vercel",
      DATABASE_URL: "postgres://unused",
      SUPABASE_POOLER_HOST: "unused",
      DB_SSL: false,
    });
    vi.unstubAllEnvs();

    expect([bus.name, bus.capabilities.delivery, scheduler]).toEqual(["vercel", "push", null]);
  });
});
