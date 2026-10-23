import { describe, expect, it, vi } from "vitest";

import type { Delivery } from "./bus.ts";
import { drainQueues, type JobSource, type PipelineQueue } from "./drain.ts";

// The drain loop behind /api/cron/work (ADR-0020), driven by a fake queue and clock.

function job(id: string): Delivery {
  return { id, attempt: 0, message: { v: 1, callId: `call-${id}` } };
}

/** A queue that hands out the given jobs per queue, a batch at a time. */
function fakeSource(jobs: Record<string, Delivery[]>) {
  const done: string[] = [];
  const failed: string[] = [];
  const source: JobSource = {
    fetch: (queue, batchSize) => Promise.resolve((jobs[queue] ?? []).splice(0, batchSize)),
    complete: (_queue, id) => {
      done.push(id);
      return Promise.resolve();
    },
    fail: (_queue, id) => {
      failed.push(id);
      return Promise.resolve();
    },
  };
  return { source, done, failed };
}

describe("drainQueues", () => {
  it("runs every queued job and stops when the queues are empty", async () => {
    const { source, done } = fakeSource({
      transcribe: [job("a"), job("b"), job("c")],
      score: [job("d")],
    });
    const run = vi.fn(() => Promise.resolve());

    const result = await drainQueues(source, run, { budgetMs: 60_000 });

    expect(result).toEqual({ completed: 4, failed: 0, stoppedBy: "empty" });
    expect(done.sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("fails a job whose handler throws so pg-boss retries it", async () => {
    const { source, done, failed } = fakeSource({ transcribe: [job("a")], score: [job("b")] });
    const run = vi.fn((queue: PipelineQueue) =>
      queue === "score" ? Promise.reject(new Error("model down")) : Promise.resolve(),
    );

    const result = await drainQueues(source, run, { budgetMs: 60_000 });

    expect(result).toEqual({ completed: 1, failed: 1, stoppedBy: "empty" });
    expect(done).toEqual(["a"]);
    expect(failed).toEqual(["b"]);
  });

  it("stops fetching once the budget is spent and leaves the rest queued", async () => {
    const queued = { transcribe: [job("a"), job("b"), job("c"), job("d")], score: [] };
    const { source, done } = fakeSource(queued);
    let clock = 0;
    const run = vi.fn(() => {
      clock += 600;
      return Promise.resolve();
    });

    const result = await drainQueues(source, run, {
      budgetMs: 1000,
      batchSize: 1,
      now: () => clock,
    });

    expect(result.stoppedBy).toBe("budget");
    expect(done).toEqual(["a", "b"]);
    expect(queued.transcribe.map((j) => j.id)).toEqual(["c", "d"]);
  });
});
