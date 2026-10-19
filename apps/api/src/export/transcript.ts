import { redactText, redactWords } from "@scc/shared";

import type { SegmentRow } from "../repo/calls.ts";

// A call's transcript as plain text and as JSON, for exports. Exports always
// mask personal data (ADR-0023); there is no reveal for a file that leaves the app.

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
      const line = `[${clock(s.start_ms)}] ${who}: ${redactText(s.text)}`;
      return s.text_en ? `${line}\n        (English) ${redactText(s.text_en)}` : line;
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
      text: redactText(s.text),
      english: s.text_en === null ? null : redactText(s.text_en),
      language: s.language,
      words: redactWords(s.words).words,
    })),
    null,
    2,
  );
}
