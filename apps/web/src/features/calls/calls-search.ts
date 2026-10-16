import {
  CALL_GROUPS,
  CALL_STATUSES,
  type CallGroup,
  type CallSummary,
  FLAGS,
  languageSchema,
} from "@scc/shared";
import { z } from "zod";

import type { CallFilters } from "@/lib/endpoints";
import { languageLabel, STATUS_LABEL } from "@/lib/format";

// The calls table's search, filters, grouping and page, kept in the URL so a
// filtered view can be bookmarked and shared. Each field parses on its own, so
// one bad value in a pasted link drops only itself.

export const PAGE_SIZE = 20;

export const callsSearchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(CALL_STATUSES).optional().catch(undefined),
  flag: z.enum(FLAGS).optional().catch(undefined),
  agentId: z.uuid().optional().catch(undefined),
  teamId: z.uuid().optional().catch(undefined),
  productId: z.uuid().optional().catch(undefined),
  language: languageSchema.optional().catch(undefined),
  groupBy: z.enum(CALL_GROUPS).optional().catch(undefined),
  batchId: z.uuid().optional().catch(undefined),
  archived: z.boolean().optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
});
export type CallsSearch = z.infer<typeof callsSearchSchema>;

/** hasFilters tells whether anything narrows the list, for "Clear filters" and the empty message. */
export function hasFilters(s: CallsSearch): boolean {
  return [
    s.q,
    s.status,
    s.flag,
    s.agentId,
    s.teamId,
    s.productId,
    s.language,
    s.batchId,
    s.archived,
  ].some(Boolean);
}

/** toFilters turns the URL state into the API query for one page. */
export function toFilters(s: CallsSearch): CallFilters {
  return {
    q: s.q,
    status: s.status,
    flag: s.flag,
    agentId: s.agentId,
    teamId: s.teamId,
    productId: s.productId,
    language: s.language,
    batchId: s.batchId,
    groupBy: s.groupBy,
    archived: s.archived,
    page: s.page ?? 1,
    limit: PAGE_SIZE,
  };
}

/** groupOf names the group a call falls in, for the header rows of a grouped table. */
export function groupOf(c: CallSummary, by: CallGroup): string {
  switch (by) {
    case "agent":
      return c.agentName;
    case "team":
      return c.teamName;
    case "product":
      return c.productName;
    case "language":
      return languageLabel(c.language);
    case "status":
      return STATUS_LABEL[c.status];
    case "flag":
      return FLAG_LABEL[c.flag];
  }
}

export const FLAG_LABEL: Record<CallSummary["flag"], string> = {
  flagged: "Flagged",
  passed: "Passed",
  pending: "Pending",
};

/**
 * applyLocally filters, groups and pages a list the browser already holds
 * (the review queue, at most 100 calls), the same way the API does for calls.
 */
export function applyLocally(
  items: CallSummary[],
  s: CallsSearch,
): { items: CallSummary[]; total: number } {
  const q = s.q?.toLowerCase();
  const found = items.filter(
    (c) =>
      (!q ||
        [c.originalFilename, c.agentName, c.teamName, c.productName].some((v) =>
          v.toLowerCase().includes(q),
        )) &&
      (!s.status || c.status === s.status) &&
      (!s.flag || c.flag === s.flag) &&
      (!s.agentId || c.agentId === s.agentId) &&
      (!s.language || c.language === s.language),
  );
  const by = s.groupBy;
  // A stable sort keeps the queue's oldest-first order inside each group.
  const ordered = by
    ? [...found].sort((a, b) => groupOf(a, by).localeCompare(groupOf(b, by)))
    : found;
  const page = s.page ?? 1;
  return {
    items: ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: ordered.length,
  };
}
