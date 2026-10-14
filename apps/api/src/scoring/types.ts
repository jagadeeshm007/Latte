import type { FindingStatus, ItemType } from "@scc/shared";

export type Channel = "agent" | "customer";

/** The transcript as the scorer sees it: numbered lines in call order. */
export interface ScoringSegment {
  seq: number;
  channel: Channel;
  startMs: number;
  endMs: number;
  text: string;
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
