import { describe, expect, it } from "vitest";

import { MS_PER_WORD, toSegments } from "./transcripts.ts";

// Uploaded transcripts as stored segments (ADR-0030).

describe("toSegments", () => {
  it("keeps given times and orders the lines by them", () => {
    const out = toSegments(
      [
        { speaker: "customer", text: "Hi.", startMs: 3000, endMs: 3500 },
        { speaker: "agent", text: "Good morning.", startMs: 0, endMs: 2500 },
      ],
      "en-IN",
    );

    expect(out.timed).toBe(true);
    expect(out.durationMs).toBe(3500);
    expect(out.segments.map((s) => [s.seq, s.channel, s.startMs])).toEqual([
      [0, "agent", 0],
      [1, "customer", 3000],
    ]);
  });

  it("orders untimed lines as sent, each lasting in proportion to its words", () => {
    const out = toSegments(
      [
        { speaker: "agent", text: "Good morning, this is Ravi." },
        { speaker: "customer", text: "Hi." },
      ],
      "hi-IN",
    );

    expect(out.timed).toBe(false);
    expect(out.durationMs).toBeNull();
    expect(out.segments.map((s) => [s.startMs, s.endMs])).toEqual([
      [0, 5 * MS_PER_WORD],
      [5 * MS_PER_WORD, 6 * MS_PER_WORD],
    ]);
    expect(out.segments[0]).toMatchObject({ language: "hi-IN", words: [], avgLogprob: null });
  });
});
