import {
  agreementSchema,
  audioUrlSchema,
  callDetailSchema,
  callListSchema,
  dashboardSchema,
  meSchema,
  queueSchema,
  referenceSchema,
  rubricListSchema,
  rubricSchema,
  scorecardSchema,
  uploadConfirmResponseSchema,
  uploadSignResponseSchema,
  usageSchema,
  type CallStatus,
  type RubricItem,
  type UploadConfirmRequest,
  type UploadSignRequest,
} from "@scc/shared";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch, apiSend } from "@/lib/api";

// Every API call the web app makes, with its query key. Keys carry every
// input that changes the result (rule 5); responses are validated with the
// shared schemas the API itself uses.

export interface CallFilters {
  status?: CallStatus | undefined;
  needsReview?: boolean | undefined;
  agentId?: string | undefined;
}

export const keys = {
  me: ["me"] as const,
  reference: ["reference"] as const,
  calls: (f: CallFilters) => ["calls", "list", f] as const,
  call: (id: string) => ["calls", "detail", id] as const,
  queue: ["queue"] as const,
  scorecard: (agentId: string) => ["scorecard", agentId] as const,
  agreement: ["agreement"] as const,
  dashboard: (groupBy: "team" | "product") => ["dashboard", groupBy] as const,
  usage: ["usage"] as const,
  rubric: ["rubric", "active"] as const,
  rubrics: ["rubric", "all"] as const,
};

const query = (f: CallFilters) => {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.needsReview !== undefined) p.set("needsReview", String(f.needsReview));
  if (f.agentId) p.set("agentId", f.agentId);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const meQuery = queryOptions({
  queryKey: keys.me,
  queryFn: ({ signal }) => apiFetch("/api/me", meSchema, { signal }),
  staleTime: 300_000,
});
export const referenceQuery = queryOptions({
  queryKey: keys.reference,
  queryFn: ({ signal }) => apiFetch("/api/reference", referenceSchema, { signal }),
  staleTime: 300_000,
});
export const callsQuery = (f: CallFilters) =>
  queryOptions({
    queryKey: keys.calls(f),
    queryFn: ({ signal }) => apiFetch(`/api/calls${query(f)}`, callListSchema, { signal }),
  });
/** All calls matching the filters, page by page with the API's cursor (review finding 8). */
export const callsPagesQuery = (f: CallFilters) =>
  infiniteQueryOptions({
    queryKey: [...keys.calls(f), "pages"] as const,
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) => {
      const base = query(f);
      const cursor = pageParam ? `${base ? "&" : "?"}cursor=${encodeURIComponent(pageParam)}` : "";
      return apiFetch(`/api/calls${base}${cursor}`, callListSchema, { signal });
    },
    getNextPageParam: (last) => last.nextCursor,
  });

export const callQuery = (id: string) =>
  queryOptions({
    queryKey: keys.call(id),
    queryFn: ({ signal }) => apiFetch(`/api/calls/${id}`, callDetailSchema, { signal }),
  });
export const queueQuery = queryOptions({
  queryKey: keys.queue,
  queryFn: ({ signal }) => apiFetch("/api/review/queue", queueSchema, { signal }),
});
/** agentId is an agent id, or "me" for the signed-in agent. */
export const scorecardQuery = (agentId: string) =>
  queryOptions({
    queryKey: keys.scorecard(agentId),
    queryFn: ({ signal }) => apiFetch(`/api/scorecard/${agentId}`, scorecardSchema, { signal }),
  });
export const agreementQuery = queryOptions({
  queryKey: keys.agreement,
  queryFn: ({ signal }) => apiFetch("/api/agreement", agreementSchema, { signal }),
});
export const dashboardQuery = (groupBy: "team" | "product") =>
  queryOptions({
    queryKey: keys.dashboard(groupBy),
    queryFn: ({ signal }) =>
      apiFetch(`/api/dashboard?groupBy=${groupBy}`, dashboardSchema, { signal }),
  });
export const usageQuery = queryOptions({
  queryKey: keys.usage,
  queryFn: ({ signal }) => apiFetch("/api/usage", usageSchema, { signal }),
});
export const rubricQuery = queryOptions({
  queryKey: keys.rubric,
  queryFn: ({ signal }) => apiFetch("/api/rubrics/active", rubricSchema, { signal }),
});
export const rubricsQuery = queryOptions({
  queryKey: keys.rubrics,
  queryFn: ({ signal }) => apiFetch("/api/rubrics", rubricListSchema, { signal }),
});

const noContent = z.undefined();

export const api = {
  signUploads: (body: UploadSignRequest) =>
    apiSend("/api/uploads/sign", uploadSignResponseSchema, "POST", body),
  confirmUploads: (body: UploadConfirmRequest) =>
    apiSend("/api/uploads/confirm", uploadConfirmResponseSchema, "POST", body),
  audioUrl: (callId: string) => apiSend(`/api/calls/${callId}/audio-url`, audioUrlSchema, "POST"),
  retry: (callId: string) =>
    apiSend(`/api/calls/${callId}/retry`, z.object({ status: z.string() }), "POST"),
  decide: (findingId: string, decision: "agree" | "disagree", note?: string) =>
    apiSend(
      `/api/findings/${findingId}/review`,
      noContent,
      "PUT",
      note ? { decision, note } : { decision },
    ),
  addFinding: (
    callId: string,
    body: { itemKey: string; status: string; segmentSeq?: number; note?: string },
  ) => apiSend(`/api/calls/${callId}/findings`, z.object({ id: z.string() }), "POST", body),
  completeReview: (callId: string) =>
    apiSend(`/api/calls/${callId}/review/complete`, noContent, "POST"),
  saveRubric: (name: string, items: RubricItem[]) =>
    apiSend("/api/rubrics", rubricSchema, "POST", { name, items }),
};
