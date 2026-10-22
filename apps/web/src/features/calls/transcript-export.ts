import type { Segment } from "@scc/shared";

// A call's transcript as a file people can open anywhere: plain text, subtitle
// formats players understand (SubRip, WebVTT), the LRC lyrics format, or JSON
// with every field. Built in the browser from the lines already on the page.

export const EXPORT_FORMATS = [
  { format: "txt", label: "Text", extension: "txt", mime: "text/plain" },
  { format: "srt", label: "SubRip subtitles", extension: "srt", mime: "application/x-subrip" },
  { format: "vtt", label: "WebVTT subtitles", extension: "vtt", mime: "text/vtt" },
  { format: "lrc", label: "LRC lyrics", extension: "lrc", mime: "text/plain" },
  { format: "json", label: "JSON", extension: "json", mime: "application/json" },
] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number]["format"];

/** Subtitle and lyric formats are built on times, so an untimed transcript gets text and JSON only. */
export const formatsFor = (timed: boolean) =>
  EXPORT_FORMATS.filter((f) => timed || f.format === "txt" || f.format === "json");

const SPEAKER = { agent: "Agent", customer: "Customer" } as const;
const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** clock is h:mm:ss with milliseconds after `sep` (SubRip uses a comma, WebVTT a dot). */
function clock(ms: number, sep: "," | "."): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
}

/** minutes keeps counting past an hour, as LRC and the plain-text stamps do. */
function minutes(ms: number): string {
  return `${pad(Math.floor(ms / 60_000))}:${pad(Math.floor((ms % 60_000) / 1000))}`;
}

export function exportTranscript(
  segments: Segment[],
  format: ExportFormat,
  options: { english?: boolean; timed?: boolean } = {},
): { body: string; extension: string; mime: string } {
  const meta = EXPORT_FORMATS.find((f) => f.format === format) ?? EXPORT_FORMATS[0];
  const text = (s: Segment) => (options.english ? (s.translation ?? s.text) : s.text);
  const who = (s: Segment) => SPEAKER[s.channel];
  let body: string;
  switch (format) {
    case "txt":
      body = segments
        .map(
          (s) =>
            `[${options.timed === false ? `line ${String(s.seq + 1)}` : minutes(s.startMs)}] ${who(s)}: ${text(s)}\n`,
        )
        .join("");
      break;
    case "srt":
      body = segments
        .map(
          (s, i) =>
            `${String(i + 1)}\n${clock(s.startMs, ",")} --> ${clock(s.endMs, ",")}\n${who(s)}: ${text(s)}\n`,
        )
        .join("\n");
      break;
    case "vtt":
      body = `WEBVTT\n\n${segments
        .map(
          (s) =>
            `${clock(s.startMs, ".")} --> ${clock(s.endMs, ".")}\n<v ${who(s)}>${text(s).replace(/-->/g, "->")}\n`,
        )
        .join("\n")}`;
      break;
    case "lrc":
      body = segments
        .map(
          (s) =>
            `[${minutes(s.startMs)}.${pad(Math.floor((s.startMs % 1000) / 10))}]${who(s)}: ${text(s)}\n`,
        )
        .join("");
      break;
    case "json":
      body = `${JSON.stringify(
        segments.map((s) => ({
          line: s.seq + 1,
          startMs: options.timed === false ? null : s.startMs,
          endMs: options.timed === false ? null : s.endMs,
          speaker: who(s),
          text: s.text,
          translation: s.translation,
          language: s.language,
          words: s.words,
        })),
        null,
        2,
      )}\n`;
      break;
  }
  return { body, extension: meta.extension, mime: meta.mime };
}
