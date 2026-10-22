import type { TranscriptLine } from "./types.ts";

// Reading a transcript a dialler or CRM exported into the lines the API takes
// (ADR-0030). Two shapes are accepted:
//   labelled text, one turn per line:   [00:41] Agent: This plan guarantees...
//   JSON: [{ "speaker": "agent", "text": "...", "startMs": 0, "endMs": 3200 }]
// A line without a label continues the turn above it. Times are kept only
// when every turn has one; otherwise the transcript is sent without times.

export class TranscriptParseError extends Error {
  constructor(
    message: string,
    /** 1-based line of the input that could not be read, when there is one. */
    readonly line: number | null,
  ) {
    super(line === null ? message : `line ${String(line)}: ${message}`);
    this.name = "TranscriptParseError";
  }
}

export interface ParseOptions {
  /** Extra labels, e.g. { "Ravi": "agent", "Mr Shah": "customer" }; matched without case. */
  speakers?: Record<string, TranscriptLine["speaker"]>;
}

const LABELS: Record<string, TranscriptLine["speaker"]> = {
  agent: "agent",
  rep: "agent",
  representative: "agent",
  advisor: "agent",
  executive: "agent",
  sales: "agent",
  customer: "customer",
  client: "customer",
  caller: "customer",
  prospect: "customer",
  lead: "customer",
};

/** [hh:mm:ss], [mm:ss], (mm:ss) or a bare mm:ss before the label. */
const TIME = /^\s*[[(]?((?:\d{1,2}:)?\d{1,2}:\d{2})[\])]?\s*[-–]?\s*/;
const LABELLED = /^([^:]{1,40}):\s*(.*)$/;
const MS_PER_WORD = 400;

function toMs(clock: string): number {
  return (
    clock
      .split(":")
      .map(Number)
      .reduce((total, part) => total * 60 + part, 0) * 1000
  );
}

function fromJson(input: string): TranscriptLine[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new TranscriptParseError("this is not valid JSON", null);
  }
  const list: unknown =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && "lines" in parsed
      ? parsed.lines
      : parsed;
  if (!Array.isArray(list)) throw new TranscriptParseError("expected a list of lines", null);
  return list.map((raw: unknown, i) => {
    const l = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const speaker = typeof l.speaker === "string" ? LABELS[l.speaker.toLowerCase()] : undefined;
    if (!speaker) throw new TranscriptParseError("speaker must be agent or customer", i + 1);
    if (typeof l.text !== "string" || !l.text.trim()) {
      throw new TranscriptParseError("text is missing", i + 1);
    }
    const timed = typeof l.startMs === "number" && typeof l.endMs === "number";
    return {
      speaker,
      text: l.text.trim(),
      ...(timed ? { startMs: l.startMs as number, endMs: l.endMs as number } : {}),
    };
  });
}

function fromText(input: string, options: ParseOptions): TranscriptLine[] {
  const labels: Record<string, TranscriptLine["speaker"]> = { ...LABELS };
  for (const [name, speaker] of Object.entries(options.speakers ?? {})) {
    labels[name.trim().toLowerCase()] = speaker;
  }
  const turns: { speaker: TranscriptLine["speaker"]; text: string; at: number | null }[] = [];
  input.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const time = TIME.exec(raw);
    const rest = time ? raw.slice(time[0].length) : raw;
    const labelled = LABELLED.exec(rest);
    const speaker = labelled?.[1] ? labels[labelled[1].trim().toLowerCase()] : undefined;
    if (labelled && speaker) {
      turns.push({
        speaker,
        text: (labelled[2] ?? "").trim(),
        at: time?.[1] ? toMs(time[1]) : null,
      });
      return;
    }
    const last = turns.at(-1);
    if (!last) {
      throw new TranscriptParseError(
        `start with a speaker label such as "Agent:" or "Customer:"${labelled?.[1] ? ` ("${labelled[1].trim()}" is not one; pass it in options.speakers)` : ""}`,
        i + 1,
      );
    }
    last.text = `${last.text} ${rest.trim()}`.trim();
  });
  const kept = turns.filter((t) => t.text);
  const timed = kept.length > 0 && kept.every((t) => t.at !== null);
  return kept.map((t, i) => {
    if (!timed || t.at === null) return { speaker: t.speaker, text: t.text };
    const next = kept[i + 1]?.at;
    const words = t.text.split(/\s+/).length;
    return {
      speaker: t.speaker,
      text: t.text,
      startMs: t.at,
      endMs:
        next !== undefined && next !== null && next >= t.at ? next : t.at + words * MS_PER_WORD,
    };
  });
}

/** parseTranscript reads labelled text or JSON into the lines the API takes. */
export function parseTranscript(input: string, options: ParseOptions = {}): TranscriptLine[] {
  const trimmed = input.trim();
  if (!trimmed) throw new TranscriptParseError("the transcript is empty", null);
  const lines =
    /^[[{]/.test(trimmed) && !TIME.test(trimmed) ? fromJson(trimmed) : fromText(trimmed, options);
  if (lines.length === 0)
    throw new TranscriptParseError("no lines with a speaker were found", null);
  return lines;
}
