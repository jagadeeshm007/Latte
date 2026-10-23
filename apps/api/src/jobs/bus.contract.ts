import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Capabilities, JobBus } from "./bus.ts";
import { QUEUES } from "./queue.ts";

// The queue port's contract (ADR-0032). Every adapter runs this suite: the
// in-memory one in a unit test, pg-boss against Postgres in an integration
// test, and each later adapter (Vercel Queues, Kafka, SQS) the same way. An
// adapter is accepted when it passes; the pipeline relies on nothing else.

export interface ContractHarness {
  bus: JobBus;
  /** Puts a payload on a topic as-is, bypassing the envelope, as an old deployment or a bad producer would. */
  sendRaw(topic: (typeof QUEUES)[keyof typeof QUEUES], payload: unknown): Promise<void>;
  /** Empties every topic. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

export interface ContractOptions {
  /** The adapter's configured retries after the first delivery; the harness sets the retry delay to 0. */
  retryLimit: number;
  /** What the adapter says it does natively; the optional cases run only where it does. */
  capabilities: Capabilities;
  /** How long a push or polling consumer may take to deliver (pg-boss polls). */
  deliveryTimeoutMs?: number;
}

const T = QUEUES.transcribe;

/** busContract defines the suite for one adapter. */
export function busContract(
  name: string,
  open: () => Promise<ContractHarness>,
  options: ContractOptions,
): void {
  describe(`queue port contract: ${name}`, () => {
    let h: ContractHarness;
    const timeout = options.deliveryTimeoutMs ?? 2_000;

    beforeEach(async () => {
      h = await open();
      await h.reset();
    });
    afterEach(async () => {
      await h.close();
    });

    it("declares the capabilities it was registered with", () => {
      expect(h.bus.capabilities).toEqual(options.capabilities);
    });

    it("delivers a published message once, as a version 1 envelope, and not again once completed", async () => {
      await h.bus.publish(T, { callId: "c1" });

      const [first] = await h.bus.fetch(T, 10);
      await h.bus.complete(T, first?.id ?? "");

      expect(first).toMatchObject({ attempt: 0, message: { v: 1, callId: "c1" } });
      expect(await h.bus.fetch(T, 10)).toEqual([]);
    });

    it("reads a payload queued before envelopes had a version as version 1", async () => {
      await h.sendRaw(T, { callId: "old", reschedules: 2 });

      const [delivery] = await h.bus.fetch(T, 10);

      expect(delivery?.message).toEqual({ v: 1, callId: "old", reschedules: 2 });
    });

    it("never hands over a payload no version understands", async () => {
      await h.sendRaw(T, { v: 99, callId: "future" });
      await h.bus.publish(T, { callId: "c2" });

      const deliveries = await h.bus.fetch(T, 10);

      expect(deliveries.map((d) => d.message.callId)).toEqual(["c2"]);
    });

    it("holds a delayed message back and delivers an immediate one", async () => {
      await h.bus.publish(T, { callId: "later" }, { delaySeconds: 3600 });
      await h.bus.publish(T, { callId: "now" });

      const deliveries = await h.bus.fetch(T, 10);

      expect(deliveries.map((d) => d.message.callId)).toEqual(["now"]);
    });

    it("redelivers a failed message with the next attempt, then stops when retries run out", async () => {
      await h.bus.publish(T, { callId: "flaky" });
      const attempts: number[] = [];

      for (let i = 0; i <= options.retryLimit; i++) {
        const [delivery] = await h.bus.fetch(T, 1);
        attempts.push(delivery?.attempt ?? -1);
        await h.bus.fail(T, delivery?.id ?? "", "boom");
      }

      expect(attempts).toEqual(Array.from({ length: options.retryLimit + 1 }, (_, i) => i));
      expect(await h.bus.fetch(T, 1)).toEqual([]);
    });

    it.runIf(options.capabilities.priority)("delivers higher priority first", async () => {
      await h.bus.publish(T, { callId: "bulk" }, { priority: 0 });
      await h.bus.publish(T, { callId: "urgent" }, { priority: 10 });

      const [first] = await h.bus.fetch(T, 1);
      const [second] = await h.bus.fetch(T, 1);

      expect([first?.message.callId, second?.message.callId]).toEqual(["urgent", "bulk"]);
    });

    it.runIf(options.capabilities.dedupe)(
      "drops a second publish with the same idempotency key",
      async () => {
        await h.bus.publish(T, { callId: "c3" }, { idempotencyKey: "c3:transcribe" });
        await h.bus.publish(T, { callId: "c3" }, { idempotencyKey: "c3:transcribe" });

        const deliveries = await h.bus.fetch(T, 10);

        expect(deliveries).toHaveLength(1);
      },
    );

    it("runs a subscriber, redelivering after a throw, never above its concurrency", async () => {
      const seen: string[] = [];
      let inFlight = 0;
      let peak = 0;
      let thrown = false;
      await h.bus.subscribe(
        T,
        async (delivery) => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await Promise.resolve();
          inFlight -= 1;
          if (delivery.message.callId === "s1" && !thrown) {
            thrown = true;
            throw new Error("first try fails");
          }
          seen.push(`${delivery.message.callId ?? ""}#${String(delivery.attempt)}`);
        },
        { concurrency: 1 },
      );

      await h.bus.publish(T, { callId: "s1" });
      await h.bus.publish(T, { callId: "s2" });

      await vi.waitFor(
        () => {
          expect([...seen].sort()).toEqual(["s1#1", "s2#0"]);
        },
        { timeout, interval: 50 },
      );
      expect(peak).toBe(1);
    });
  });
}
