import { redactText, redactWords } from "@scc/shared";

import type { SegmentRow } from "../repo/calls.ts";

// A call's transcript as plain text and as JSON, for exports. Exports always
// mask personal data (ADR-0023); there is no reveal for a file that leaves the app.

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  return `${mm}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * transcriptText: one line per utterance, "[01:05] Agent: ...", the English
 * under a regional line. An untimed transcript upload says "[line 3]" instead,
 * since its stored times are only an order (ADR-0030).
 */
export function transcriptText(segments: SegmentRow[], timed = true): string {
  return segments
    .map((s) => {
      const who = s.channel === "agent" ? "Agent" : "Customer";
      const at = timed ? clock(s.start_ms) : `line ${String(s.seq + 1)}`;
      const line = `[${at}] ${who}: ${redactText(s.text)}`;
      return s.text_en ? `${line}\n        (English) ${redactText(s.text_en)}` : line;
    })
    .join("\n")
    .concat("\n");
}

/** transcriptJson: the lines with times, or null times and a line number for an untimed upload. */
export function transcriptJson(segments: SegmentRow[], timed = true): string {
  return JSON.stringify(
    segments.map((s) => ({
      seq: s.seq,
      line: s.seq + 1,
      speaker: s.channel,
      startMs: timed ? s.start_ms : null,
      endMs: timed ? s.end_ms : null,
      text: redactText(s.text),
      english: s.text_en === null ? null : redactText(s.text_en),
      language: s.language,
      words: redactWords(s.words).words,
    })),
    null,
    2,
  );
}
