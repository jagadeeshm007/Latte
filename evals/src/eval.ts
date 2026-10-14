import type { FindingStatus, RubricItem } from "@scc/shared";

import type { CallScript, Prohibited } from "./scripts.ts";

// Pure eval logic: transcripts from scripts, per-item agreement with the
// labels, and the gate on planted prohibited statements (REQ-029, REQ-030).

export interface EvalSegment {
  seq: number;
  channel: "agent" | "customer";
  startMs: number;
  endMs: number;
  text: string;
}

export interface Planted {
  key: Prohibited;
  startMs: number;
  endMs: number;
  text: string;
}

export interface EvalFinding {
  itemKey: string;
  status: FindingStatus;
  source: "llm" | "rule";
  startMs: number | null;
  endMs: number | null;
  grounded: boolean;
  rationale?: string | null;
}

/** A rule-net hit on a transcript line, by time. */
export interface RuleHitSpan {
  itemKey: string;
  startMs: number;
  endMs: number;
}

const GAP_MS = 600;

/** Speech time of a line: about 2.6 words a second, as the TTS voices speak. */
export function lineDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.round(400 + words * 380);
}

/** scriptTranscript lays the lines out on a timeline, as the renderer does. */
export function scriptTranscript(call: CallScript): {
  segments: EvalSegment[];
  planted: Planted[];
} {
  const segments: EvalSegment[] = [];
  const planted: Planted[] = [];
  let t = 500;
  call.lines.forEach((line, seq) => {
    const duration = lineDurationMs(line.t);
    const segment: EvalSegment = {
      seq,
      channel: line.s === "A" ? "agent" : "customer",
      startMs: t,
      endMs: t + duration,
      text: line.t,
    };
    segments.push(segment);
    if (line.plant)
      planted.push({
        key: line.plant,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: line.t,
      });
    t += duration + GAP_MS;
  });
  return { segments, planted };
}

export interface CallOutcome {
  callId: string;
  judgeFailed: boolean;
  items: { key: string; expected: FindingStatus; actual: FindingStatus | null; note: string | null }[];
  gateFailures: string[];
  ruleCaught: string[];
}

const overlaps = (
  a: { startMs: number; endMs: number },
  b: { startMs: number | null; endMs: number | null },
) => b.startMs !== null && b.endMs !== null && b.startMs <= a.endMs && b.endMs >= a.startMs;

export function evaluateCall(
  call: CallScript,
  planted: Planted[],
  findings: EvalFinding[],
  judgeFailed: boolean,
  ruleHits: RuleHitSpan[] = [],
): CallOutcome {
  const llm = findings.filter((f) => f.source === "llm");
  const items = Object.entries(call.labels).map(([key, expected]) => ({
    key,
    expected,
    actual: llm.find((f) => f.itemKey === key)?.status ?? null,
    note: llm.find((f) => f.itemKey === key)?.rationale ?? null,
  }));
  const gateFailures: string[] = [];
  const ruleCaught: string[] = [];
  for (const p of planted) {
    const caught = llm.some(
      (f) => f.itemKey === p.key && f.status === "breach" && f.grounded && overlaps(p, f),
    );
    if (!caught) {
      gateFailures.push(`${call.id}: judge missed planted ${p.key}: "${p.text}"`);
    }
    // Reported apart from the gate: a rule hit never makes up for a judge miss.
    if (ruleHits.some((h) => h.itemKey === p.key && overlaps(p, h))) {
      ruleCaught.push(p.key);
    }
  }
  return { callId: call.id, judgeFailed, items, gateFailures, ruleCaught };
}

export interface ItemSummary {
  key: string;
  label: string;
  n: number;
  agreed: number;
  agreement: number;
  /** Of calls where the label is a miss or a breach, how many the judge flagged. */
  recall: number | null;
  /** Of calls the judge flagged as a miss or breach, how many the label agrees with. */
  precision: number | null;
}

const BAD = new Set<FindingStatus>(["missed", "breach"]);

export function summarise(outcomes: CallOutcome[], rubric: RubricItem[]): ItemSummary[] {
  return rubric.map((item) => {
    const rows = outcomes.flatMap((o) => o.items.filter((i) => i.key === item.key));
    const agreed = rows.filter((r) => r.actual === r.expected).length;
    const labelledBad = rows.filter((r) => BAD.has(r.expected));
    const flagged = rows.filter((r) => r.actual !== null && BAD.has(r.actual));
    const ratio = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 1000) / 1000);
    return {
      key: item.key,
      label: item.label,
      n: rows.length,
      agreed,
      agreement: ratio(agreed, rows.length) ?? 0,
      recall: ratio(
        labelledBad.filter((r) => r.actual !== null && BAD.has(r.actual)).length,
        labelledBad.length,
      ),
      precision: ratio(flagged.filter((r) => BAD.has(r.expected)).length, flagged.length),
    };
  });
}

const pct = (v: number | null) => (v === null ? "  n/a" : `${(v * 100).toFixed(0).padStart(4)}%`);

export function formatReport(summary: ItemSummary[], outcomes: CallOutcome[]): string {
  const lines = [
    "item                 n  agreement  recall  precision",
    ...summary.map(
      (s) =>
        `${s.key.padEnd(20)} ${String(s.n).padStart(2)}  ${pct(s.agreement)}     ${pct(s.recall)}   ${pct(s.precision)}`,
    ),
  ];
  const planted = outcomes.reduce((n, o) => n + o.gateFailures.length, 0);
  const total = outcomes.reduce(
    (n, o) => n + o.items.filter((i) => i.key !== "" && i.expected === "breach").length,
    0,
  );
  const rule = outcomes.reduce((n, o) => n + o.ruleCaught.length, 0);
  const failedJudges = outcomes.filter((o) => o.judgeFailed).map((o) => o.callId);
  lines.push(
    "",
    `planted prohibited statements: ${String(total)}, missed by the judge: ${String(planted)}, also caught by the rule net: ${String(rule)}`,
  );
  if (failedJudges.length) lines.push(`judge failed on: ${failedJudges.join(", ")}`);
  const disagreements = outcomes.flatMap((o) =>
    o.items
      .filter((i) => i.actual !== i.expected)
      .map((i) => `  ${o.callId} ${i.key}: label ${i.expected}, judge ${i.actual ?? "none"}${i.note ? ` (${i.note})` : ""}`),
  );
  if (disagreements.length) lines.push("", "disagreements with the labels:", ...disagreements);
  return lines.join("\n");
}
