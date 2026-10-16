import type { SegmentRow } from "../repo/calls.ts";

// A call's transcript as plain text and as JSON, for exports.

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  return `${mm}:${String(s % 60).padStart(2, "0")}`;
}

/** transcriptText: one line per utterance, "[01:05] Agent: ...", the English under a regional line. */
export function transcriptText(segments: SegmentRow[]): string {
  return segments
    .map((s) => {
      const who = s.channel === "agent" ? "Agent" : "Customer";
      const line = `[${clock(s.start_ms)}] ${who}: ${s.text}`;
      return s.text_en ? `${line}\n        (English) ${s.text_en}` : line;
    })
    .join("\n")
    .concat("\n");
}

export function transcriptJson(segments: SegmentRow[]): string {
  return JSON.stringify(
    segments.map((s) => ({
      seq: s.seq,
      speaker: s.channel,
      startMs: s.start_ms,
      endMs: s.end_ms,
      text: s.text,
      english: s.text_en,
      language: s.language,
      words: s.words,
    })),
    null,
    2,
  );
}
