import { describe, expect, it } from "vitest";

import { memoryBus } from "./adapters/memory.ts";
import { enqueueVia, readEnvelope } from "./bus.ts";
import { QUEUES } from "./queue.ts";

// The queue port's own helpers (ADR-0032).

describe("readEnvelope", () => {
  it("reads a versioned envelope and one queued before versions as version 1", () => {
    expect(readEnvelope({ v: 1, callId: "c" })).toEqual({ v: 1, callId: "c" });
    expect(readEnvelope({ callId: "c", reschedules: 3 })).toEqual({
      v: 1,
      callId: "c",
      reschedules: 3,
    });
  });

  it("refuses an unknown version or a malformed field", () => {
    expect(() => readEnvelope({ v: 2, callId: "c" })).toThrow();
    expect(() => readEnvelope({ callId: "" })).toThrow();
    expect(() => readEnvelope({ reschedules: -1 })).toThrow();
  });
});

describe("enqueueVia", () => {
  it("publishes through the port, turning startAfterSeconds into a delay and keeping priority", async () => {
    let t = 0;
    const bus = memoryBus({ now: () => t });
    const enqueue = enqueueVia(bus);

    await enqueue(QUEUES.score, { callId: "later" }, { startAfterSeconds: 60, priority: 10 });
    await enqueue(QUEUES.score, { callId: "now" }, { priority: 0 });
    const before = await bus.fetch(QUEUES.score, 10);
    t = 60_000;
    const after = await bus.fetch(QUEUES.score, 10);

    expect(before.map((d) => d.message.callId)).toEqual(["now"]);
    expect(after.map((d) => d.message.callId)).toEqual(["later"]);
  });
});
