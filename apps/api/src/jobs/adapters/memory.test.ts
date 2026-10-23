import { describe, expect, it } from "vitest";

import { busContract } from "../bus.contract.ts";
import { QUEUES } from "../queue.ts";
import { memoryBus } from "./memory.ts";

// The in-memory adapter against the queue port's contract, plus what only it can show quickly.

busContract(
  "memory",
  () => {
    const bus = memoryBus({ retryLimit: 2 });
    return Promise.resolve({
      bus,
      sendRaw: (topic, payload) => {
        bus.sendRaw(topic, payload);
        return Promise.resolve();
      },
      reset: () => Promise.resolve(),
      close: () => bus.stop(),
    });
  },
  { retryLimit: 2, capabilities: { delivery: "pull", delay: true, priority: true, dedupe: true } },
);

describe("memory adapter", () => {
  it("backs off retries on its clock and keeps what died", async () => {
    let t = 0;
    const bus = memoryBus({ now: () => t, retryLimit: 1, retryDelaySeconds: 30 });
    await bus.publish(QUEUES.score, { callId: "c" });

    const [first] = await bus.fetch(QUEUES.score, 1);
    await bus.fail(QUEUES.score, first?.id ?? "", "boom");
    const tooSoon = await bus.fetch(QUEUES.score, 1);
    t = 30_000;
    const [second] = await bus.fetch(QUEUES.score, 1);
    await bus.fail(QUEUES.score, second?.id ?? "", "boom");

    expect(tooSoon).toEqual([]);
    expect(second?.attempt).toBe(1);
    expect(bus.dead(QUEUES.score)).toEqual([{ v: 1, callId: "c" }]);
  });

  it("refuses to settle a delivery it never leased", async () => {
    const bus = memoryBus();

    await expect(bus.complete(QUEUES.score, "nope")).rejects.toThrow("no leased delivery");
  });
});
