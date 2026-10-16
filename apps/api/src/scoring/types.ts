import type { FindingStatus, ItemType } from "@scc/shared";

export type Channel = "agent" | "customer";

/** The transcript as the scorer sees it: numbered lines in call order. */
export interface ScoringSegment {
  seq: number;
  channel: Channel;
  startMs: number;
  endMs: number;
  /** What was said, in the call's language: quotes always come from here (tenet 2). */
  text: string;
  /** English translation of a regional line; the judge and the phrase rules read it when set. */
  textEn?: string | null;
}

/** readText is the line as the judge and the rules read it: English when translated. */
export function readText(s: ScoringSegment): string {
  return s.textEn ?? s.text;
}

/** A finding before it is saved; times and quote always come from a segment (tenet 2). */
export interface FindingDraft {
  itemKey: string;
  itemType: ItemType;
  status: FindingStatus;
  source: "llm" | "rule";
  quote: string | null;
  segmentSeq: number | null;
  startMs: number | null;
  endMs: number | null;
  channel: Channel | null;
  rationale: string | null;
  grounded: boolean;
}
