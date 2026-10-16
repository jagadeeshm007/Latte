import type { Segment } from "@scc/shared";
import { describe, expect, it } from "vitest";

import { buildBars, callDurationMs, segmentAt } from "./waveform-bars";

const seg = (
  seq: number,
  channel: Segment["channel"],
  startMs: number,
  endMs: number,
): Segment => ({
  seq,
  channel,
  startMs,
  endMs,
  text: `line ${String(seq)}`,
  language: "en",
  avgLogprob: null,
  translation: null,
  words: [],
});

// Agent 0-4 s, silence 4-6 s, customer 6-10 s.
const segments = [seg(0, "agent", 0, 4000), seg(1, "customer", 6000, 10_000)];

describe("waveform bars", () => {
  it("colours each bar by the speaker at its midpoint and leaves silences flat", () => {
    const bars = buildBars(segments, 10_000, 10);
    expect(bars.map((b) => b.channel)).toEqual([
      "agent",
      "agent",
      "agent",
      "agent",
      null,
      null,
      "customer",
      "customer",
      "customer",
      "customer",
    ]);
    expect(bars[4]?.amp).toBeLessThan(0.1);
    expect(bars[1]?.amp).toBeGreaterThan(0.1);
    expect(bars.map((b) => b.seq)).toEqual([0, 0, 0, 0, null, null, 1, 1, 1, 1]);
  });

  it("draws the same shape on every render", () => {
    expect(buildBars(segments, 10_000, 40)).toEqual(buildBars(segments, 10_000, 40));
  });

  it("uses measured peaks for heights once the audio is decoded", () => {
    const peaks = Array.from({ length: 10 }, (_, i) => i / 10);
    const bars = buildBars(segments, 10_000, 10, peaks);
    expect(bars[9]?.amp).toBeCloseTo(0.9);
    expect(bars[9]?.channel).toBe("customer");
    // A near-silent spoken bar keeps a visible floor.
    expect(bars[0]?.amp).toBeCloseTo(0.08);
  });

  it("returns no bars for an empty call", () => {
    expect(buildBars([], 0, 10)).toEqual([]);
  });
});

describe("segmentAt and duration", () => {
  it("finds the segment under a moment, or none in a silence", () => {
    expect(segmentAt(segments, 1000)?.seq).toBe(0);
    expect(segmentAt(segments, 5000)).toBeUndefined();
    expect(segmentAt(segments, 6000)?.seq).toBe(1);
    expect(segmentAt(segments, 10_000)).toBeUndefined();
  });

  it("prefers the audio's own length, else the last segment's end", () => {
    expect(callDurationMs(segments, 12_345)).toBe(12_345);
    expect(callDurationMs(segments, Number.NaN)).toBe(10_000);
    expect(callDurationMs(segments)).toBe(10_000);
  });
});
