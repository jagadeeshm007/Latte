import type { Language, TranscriptLine } from "@scc/shared";

// An uploaded transcript becomes the same transcript_segments rows that
// speech-to-text writes, so scoring, review and exports read one shape
// (ADR-0030). Lines with times keep them. Lines without get stored times that
// are only an order: each line lasts in proportion to its words, so the talk
// ratio becomes each side's share of the words, and screens show line
// numbers because the call is marked untimed.

/** About 150 words a minute; it sets an order, never a time anyone sees. */
export const MS_PER_WORD = 400;

export interface TranscriptSegments {
  timed: boolean;
  /** The last line's end when times were given; unknown otherwise. */
  durationMs: number | null;
  segments: {
    seq: number;
    channel: TranscriptLine["speaker"];
    startMs: number;
    endMs: number;
    text: string;
    language: string | null;
    avgLogprob: null;
    words: never[];
  }[];
}

const wordsIn = (text: string) => Math.max(1, text.split(/\s+/).filter(Boolean).length);

/** toSegments turns uploaded lines into stored segments, ordered as the call ran. */
export function toSegments(lines: TranscriptLine[], language: Language): TranscriptSegments {
  const timed = lines.every((l) => l.startMs !== undefined && l.endMs !== undefined);
  let clock = 0;
  const placed = lines.map((l) => {
    if (timed) return { line: l, startMs: l.startMs ?? 0, endMs: l.endMs ?? 0 };
    const startMs = clock;
    clock += wordsIn(l.text) * MS_PER_WORD;
    return { line: l, startMs, endMs: clock };
  });
  // Timed lines may arrive per speaker; the call reads in time order. Sorting is stable.
  if (timed) placed.sort((a, b) => a.startMs - b.startMs);
  return {
    timed,
    durationMs: timed ? Math.max(...placed.map((p) => p.endMs)) : null,
    segments: placed.map((p, seq) => ({
      seq,
      channel: p.line.speaker,
      startMs: p.startMs,
      endMs: p.endMs,
      text: p.line.text,
      language,
      avgLogprob: null,
      words: [],
    })),
  };
}
