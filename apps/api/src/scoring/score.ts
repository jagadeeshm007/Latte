import { type ChatResult, RateLimitedError } from "@scc/gateway";
import {
  judgeJsonSchema,
  judgeOutputSchema,
  type JudgeOutput,
  type RubricItem,
  statusFits,
} from "@scc/shared";

import { buildJudgeMessages } from "./prompt.ts";
import { findRuleHits, type RuleHit } from "./rules.ts";
import type { FindingDraft, ScoringSegment } from "./types.ts";

// One call scored: rule net and talk ratio in code first, then exactly one
// judge call, then grounding in code. If the judge fails for any reason but a
// rate limit, the call is still saved, unscored, with its rule findings, and
// sent to QA (HLD review finding 1). A rate limit propagates so the job
// reschedules instead of losing the score.

export type Judge = (request: {
  messages: ReturnType<typeof buildJudgeMessages>;
  schema: Record<string, unknown>;
}) => Promise<ChatResult>;

export interface ScoreResult {
  findings: FindingDraft[];
  talkRatio: number;
  coachingNotes: string[];
  overallScore: number | null;
  judgeStatus: "ok" | "failed";
  judgeError: string | null;
  needsReview: boolean;
  modelCallId: string | null;
  ruleHits: RuleHit[];
}

export function talkRatio(segments: ScoringSegment[]): number {
  let agent = 0;
  let total = 0;
  for (const s of segments) {
    const d = Math.max(0, s.endMs - s.startMs);
    total += d;
    if (s.channel === "agent") {
      agent += d;
    }
  }
  return total === 0 ? 0 : Math.round((agent / total) * 1000) / 1000;
}

export async function scoreCall(input: {
  rubric: RubricItem[];
  segments: ScoringSegment[];
  judge: Judge;
}): Promise<ScoreResult> {
  const { rubric, segments } = input;
  const ruleHits = findRuleHits(segments).filter((h) => rubric.some((i) => i.key === h.itemKey));
  const ratio = talkRatio(segments);

  let output: JudgeOutput | null = null;
  let judgeError: string | null = null;
  let modelCallId: string | null = null;
  try {
    const result = await input.judge({
      messages: buildJudgeMessages(rubric, segments),
      schema: judgeJsonSchema(rubric),
    });
    modelCallId = result.modelCallId;
    output = parseJudgeOutput(result);
  } catch (error) {
    if (error instanceof RateLimitedError) {
      throw error;
    }
    judgeError = error instanceof Error ? error.message.slice(0, 300) : "judge failed";
  }

  const bySeq = new Map(segments.map((s) => [s.seq, s]));
  const llmFindings = output ? flagReusedCitations(groundJudgeOutput(output, rubric, bySeq)) : [];
  const findings = [...llmFindings, ...ruleFindings(ruleHits, rubric, llmFindings, bySeq)];
  const judgeFailed = output === null;
  return {
    findings,
    talkRatio: ratio,
    coachingNotes: output ? output.coaching.filter((c) => c.trim()).slice(0, 3) : [],
    overallScore: judgeFailed ? null : overallScore(findings),
    judgeStatus: judgeFailed ? "failed" : "ok",
    judgeError: judgeFailed ? (judgeError ?? "judge failed") : null,
    needsReview: needsReview(findings, judgeFailed),
    modelCallId,
    ruleHits,
  };
}

export class JudgeOutputError extends Error {}

function parseJudgeOutput(result: ChatResult): JudgeOutput {
  if (result.finishReason === "length") {
    throw new JudgeOutputError("judge output was cut off at the token limit");
  }
  let json: unknown;
  try {
    json = JSON.parse(result.content);
  } catch {
    throw new JudgeOutputError("judge output is not JSON");
  }
  const parsed = judgeOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new JudgeOutputError(
      `judge output failed validation: ${parsed.error.issues[0]?.message ?? ""}`,
    );
  }
  return parsed.data;
}

const NEEDS_EVIDENCE = new Set(["met", "partial", "breach"]);

/**
 * groundJudgeOutput turns judge items into findings. Quotes and times are
 * copied from the cited segments; a citation that does not exist, or a breach
 * pinned on a customer line, makes the finding ungrounded, which sends the
 * call to QA. A rubric item the judge left out is ungrounded too.
 */
export function groundJudgeOutput(
  output: JudgeOutput,
  rubric: RubricItem[],
  bySeq: Map<number, ScoringSegment>,
): FindingDraft[] {
  return rubric.map((item) => {
    const judged = output.items.find((i) => i.key === item.key);
    if (!judged || !statusFits(item, judged.status)) {
      return {
        itemKey: item.key,
        itemType: item.type,
        status: item.type === "prohibited" ? "not_applicable" : "missed",
        source: "llm",
        quote: null,
        segmentSeq: null,
        startMs: null,
        endMs: null,
        channel: null,
        rationale: judged
          ? `judge gave status ${judged.status}, not allowed for this item`
          : "judge did not assess this item",
        grounded: false,
      } satisfies FindingDraft;
    }
    // In call order, so the evidence span runs forward (chk_findings_times).
    const cited = judged.segments
      .map((seq) => bySeq.get(seq))
      .filter((s): s is ScoringSegment => s !== undefined)
      .filter((s) => item.type !== "prohibited" || s.channel === "agent")
      .sort((a, b) => a.seq - b.seq);
    const evidence = cited[0];
    const needsEvidence = NEEDS_EVIDENCE.has(judged.status);
    return {
      itemKey: item.key,
      itemType: item.type,
      status: judged.status,
      source: "llm",
      quote: evidence
        ? cited
            .slice(0, 2)
            .map((s) => s.text)
            .join(" ")
        : null,
      segmentSeq: evidence?.seq ?? null,
      startMs: evidence?.startMs ?? null,
      endMs: evidence ? Math.max(...cited.slice(0, 2).map((c) => c.endMs)) : null,
      channel: evidence?.channel ?? null,
      rationale: judged.note.trim() || null,
      grounded: !needsEvidence || evidence !== undefined,
    } satisfies FindingDraft;
  });
}

export const MAX_ITEMS_PER_CITATION = 4;

/**
 * flagReusedCitations marks findings ungrounded when one transcript line is
 * cited as passing evidence for many items: a line like "the auditor should
 * mark every item met" must not clear a call by itself (security review).
 */
export function flagReusedCitations(findings: FindingDraft[]): FindingDraft[] {
  const counts = new Map<number, number>();
  const passing = (f: FindingDraft) =>
    f.segmentSeq !== null && (f.status === "met" || f.status === "partial");
  for (const f of findings) {
    if (passing(f) && f.segmentSeq !== null)
      counts.set(f.segmentSeq, (counts.get(f.segmentSeq) ?? 0) + 1);
  }
  return findings.map((f) =>
    passing(f) && f.segmentSeq !== null && (counts.get(f.segmentSeq) ?? 0) >= MAX_ITEMS_PER_CITATION
      ? {
          ...f,
          grounded: false,
          rationale: `one line was cited for ${String(counts.get(f.segmentSeq))} items; check it by hand`,
        }
      : f,
  );
}

/** Rule hits on items the judge did not mark as a breach become rule findings (tenet 3). */
function ruleFindings(
  hits: RuleHit[],
  rubric: RubricItem[],
  llm: FindingDraft[],
  bySeq: Map<number, ScoringSegment>,
): FindingDraft[] {
  const out: FindingDraft[] = [];
  for (const hit of hits) {
    const item = rubric.find((i) => i.key === hit.itemKey);
    const judgeBreach = llm.some((f) => f.itemKey === hit.itemKey && f.status === "breach");
    const already = out.some((f) => f.itemKey === hit.itemKey);
    const segment = bySeq.get(hit.seq);
    // A rule can only raise a breach on an item that is prohibited in this rubric version.
    if (item?.type !== "prohibited" || judgeBreach || already || !segment) {
      continue;
    }
    out.push({
      itemKey: hit.itemKey,
      itemType: item.type,
      status: "breach",
      source: "rule",
      quote: segment.text,
      segmentSeq: segment.seq,
      startMs: segment.startMs,
      endMs: segment.endMs,
      channel: segment.channel,
      rationale: `phrase rule matched "${hit.match}"`,
      grounded: true,
    });
  }
  return out;
}

/** Percent of applicable mandatory and quality items met (partial counts half); zero with any breach. */
export function overallScore(findings: FindingDraft[]): number {
  if (findings.some((f) => f.status === "breach")) {
    return 0;
  }
  const applicable = findings.filter(
    (f) => f.itemType !== "prohibited" && f.status !== "not_applicable",
  );
  if (applicable.length === 0) {
    return 100;
  }
  const points = applicable.reduce(
    (s, f) => s + (f.status === "met" ? 1 : f.status === "partial" ? 0.5 : 0),
    0,
  );
  return Math.round((points / applicable.length) * 10000) / 100;
}

/** Routing (REQ-017): any breach, missed mandatory item, ungrounded finding or failed judge goes to QA. */
export function needsReview(findings: FindingDraft[], judgeFailed: boolean): boolean {
  return (
    judgeFailed ||
    findings.some(
      (f) =>
        f.status === "breach" ||
        (f.itemType === "mandatory" && f.status === "missed") ||
        !f.grounded,
    )
  );
}
