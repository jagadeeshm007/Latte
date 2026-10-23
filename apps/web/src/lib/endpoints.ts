import {
  agreementSchema,
  billingPricesSchema,
  statementSchema,
  statusSchema,
  memberListSchema,
  memberSchema,
  teamSettingsListSchema,
  teamSettingsSchema,
  alertFiringListSchema,
  alertRuleListSchema,
  alertRuleSchema,
  digestSettingSchema,
  notificationListSchema,
  savedViewListSchema,
  savedViewSchema,
  unreadCountSchema,
  apiKeyListSchema,
  apiKeyLogsSchema,
  apiKeyMetricsSchema,
  apiKeySchema,
  createdApiKeySchema,
  createdWebhookSchema,
  revokeAllKeysResponseSchema,
  webhookDeliveryListSchema,
  webhookEndpointListSchema,
  webhookEndpointSchema,
  batchDetailSchema,
  batchListSchema,
  batchRetryResponseSchema,
  audioUrlSchema,
  callDetailSchema,
  callListSchema,
  highlightsSchema,
  leaderboardSchema,
  meSchema,
  queueSchema,
  referenceSchema,
  rubricListSchema,
  rubricSchema,
  scorecardSchema,
  uploadConfirmResponseSchema,
  uploadSignResponseSchema,
  usageHistorySchema,
  usageSchema,
  type AlertRuleRequest,
  type BillingPrices,
  type PostNoticeRequest,
  type InviteMemberRequest,
  type UpdateMemberRequest,
  type UpdateMeRequest,
  type ApiBucket,
  type SavedViewPage,
  type SaveViewRequest,
  type UpdateViewRequest,
  type BatchExportPart,
  type CreateApiKeyRequest,
  type CreateWebhookRequest,
  type UpdateWebhookRequest,
  type UpdateApiKeyRequest,
  type BatchState,
  type BatchUpdateRequest,
  type CallGroup,
  type CallStatus,
  type DashboardGroup,
  type Flag,
  type Language,
  type LeaderboardSort,
  type RubricItem,
  type UploadConfirmRequest,
  type TranscriptUploadRequest,
  type UploadSignRequest,
} from "@scc/shared";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch, apiSend } from "@/lib/api";
import { env } from "@/lib/env";

// Every API call the web app makes, with its query key. Keys carry every
// input that changes the result (rule 5); responses are validated with the
// shared schemas the API itself uses.

export interface CallFilters {
  status?: CallStatus | undefined;
  batchId?: string | undefined;
  needsReview?: boolean | undefined;
  agentId?: string | undefined;
  teamId?: string | undefined;
  productId?: string | undefined;
  language?: Language | undefined;
  flag?: Flag | undefined;
  q?: string | undefined;
  archived?: boolean | undefined;
  groupBy?: CallGroup | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/** A date range for the dashboard; both ends are ISO dates (YYYY-MM-DD). */
export interface DateRange {
  from: string;
  to: string;
}

export interface LeaderboardParams extends DateRange {
  groupBy: DashboardGroup;
  q?: string | undefined;
  sort: LeaderboardSort;
  dir: "asc" | "desc";
  page: number;
  limit: number;
  minCalls?: number | undefined;
}

export interface BatchFilters {
  q?: string | undefined;
  state?: BatchState | undefined;
  archived?: boolean | undefined;
  page: number;
  limit: number;
}

export interface ApiKeyLogFilters {
  status?: "2xx" | "4xx" | "5xx" | "429" | undefined;
  bucket?: ApiBucket | undefined;
  page: number;
  limit: number;
}

export interface DeliveryFilters {
  status?: "pending" | "succeeded" | "failed" | undefined;
  page: number;
  limit: number;
}

export const keys = {
  me: ["me"] as const,
  reference: ["reference"] as const,
  calls: (f: CallFilters) => ["calls", "list", f] as const,
  call: (id: string, reveal = false) => ["calls", "detail", id, { reveal }] as const,
  queue: ["queue"] as const,
  scorecard: (agentId: string) => ["scorecard", agentId] as const,
  agreement: ["agreement"] as const,
  highlights: (r: DateRange) => ["dashboard", "highlights", r] as const,
  leaderboard: (p: LeaderboardParams) => ["dashboard", "leaderboard", p] as const,
  usage: ["usage"] as const,
  usageHistory: (days: number) => ["usage", "history", days] as const,
  batches: (f: BatchFilters) => ["batches", "list", f] as const,
  batch: (id: string) => ["batches", "detail", id] as const,
  apiKeys: ["api-keys", "list"] as const,
  webhooks: ["webhooks", "list"] as const,
  teams: ["teams"] as const,
  members: ["members"] as const,
  prices: ["billing", "prices"] as const,
  statement: (month: string) => ["billing", "statement", month] as const,
  status: ["status"] as const,
  savedViews: (page: SavedViewPage) => ["saved-views", page] as const,
  notifications: (f: { unread: boolean; page: number }) => ["notifications", "list", f] as const,
  unread: ["notifications", "unread"] as const,
  digest: ["digest"] as const,
  alertRules: ["alerts", "rules"] as const,
  alertFirings: ["alerts", "firings"] as const,
  webhook: (id: string) => ["webhooks", "detail", id] as const,
  webhookDeliveries: (id: string, f: DeliveryFilters) => ["webhooks", "deliveries", id, f] as const,
  apiKey: (id: string) => ["api-keys", "detail", id] as const,
  apiKeyMetrics: (id: string, days: number) => ["api-keys", "metrics", id, days] as const,
  apiKeyLogs: (id: string, f: ApiKeyLogFilters) => ["api-keys", "logs", id, f] as const,
  rubric: ["rubric", "active"] as const,
  rubrics: ["rubric", "all"] as const,
  rubricFor: (productId: string | null) => ["rubric", "active", productId] as const,
  rubricVersions: (productId: string | null) => ["rubric", "all", productId] as const,
};

const query = (f: object) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f) as [string, string | number | boolean | undefined][]) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
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
/** reveal asks for personal data unmasked; the API allows it to QA and managers and records it. */
export const callQuery = (id: string, reveal = false) =>
  queryOptions({
    queryKey: keys.call(id, reveal),
    queryFn: ({ signal }) =>
      apiFetch(`/api/calls/${id}${reveal ? "?reveal=pii" : ""}`, callDetailSchema, { signal }),
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
export const highlightsQuery = (range: DateRange) =>
  queryOptions({
    queryKey: keys.highlights(range),
    queryFn: ({ signal }) =>
      apiFetch(`/api/dashboard/highlights${query(range)}`, highlightsSchema, { signal }),
  });
export const leaderboardQuery = (params: LeaderboardParams) =>
  queryOptions({
    queryKey: keys.leaderboard(params),
    queryFn: ({ signal }) =>
      apiFetch(`/api/dashboard/leaderboard${query(params)}`, leaderboardSchema, { signal }),
  });
export const batchesQuery = (f: BatchFilters) =>
  queryOptions({
    queryKey: keys.batches(f),
    queryFn: ({ signal }) => apiFetch(`/api/batches${query(f)}`, batchListSchema, { signal }),
  });
export const batchQuery = (id: string) =>
  queryOptions({
    queryKey: keys.batch(id),
    queryFn: ({ signal }) => apiFetch(`/api/batches/${id}`, batchDetailSchema, { signal }),
  });
export const apiKeysQuery = queryOptions({
  queryKey: keys.apiKeys,
  queryFn: ({ signal }) => apiFetch("/api/api-keys", apiKeyListSchema, { signal }),
});
export const apiKeyQuery = (id: string) =>
  queryOptions({
    queryKey: keys.apiKey(id),
    queryFn: ({ signal }) => apiFetch(`/api/api-keys/${id}`, apiKeySchema, { signal }),
  });
export const apiKeyMetricsQuery = (id: string, days: number) =>
  queryOptions({
    queryKey: keys.apiKeyMetrics(id, days),
    queryFn: ({ signal }) =>
      apiFetch(`/api/api-keys/${id}/metrics?days=${String(days)}`, apiKeyMetricsSchema, {
        signal,
      }),
  });
export const apiKeyLogsQuery = (id: string, f: ApiKeyLogFilters) =>
  queryOptions({
    queryKey: keys.apiKeyLogs(id, f),
    queryFn: ({ signal }) =>
      apiFetch(`/api/api-keys/${id}/logs${query(f)}`, apiKeyLogsSchema, { signal }),
  });
export const webhooksQuery = queryOptions({
  queryKey: keys.webhooks,
  queryFn: ({ signal }) => apiFetch("/api/webhooks", webhookEndpointListSchema, { signal }),
});
export const webhookQuery = (id: string) =>
  queryOptions({
    queryKey: keys.webhook(id),
    queryFn: ({ signal }) => apiFetch(`/api/webhooks/${id}`, webhookEndpointSchema, { signal }),
  });
export const webhookDeliveriesQuery = (id: string, f: DeliveryFilters) =>
  queryOptions({
    queryKey: keys.webhookDeliveries(id, f),
    queryFn: ({ signal }) =>
      apiFetch(`/api/webhooks/${id}/deliveries${query(f)}`, webhookDeliveryListSchema, { signal }),
  });
export const savedViewsQuery = (page: SavedViewPage) =>
  queryOptions({
    queryKey: keys.savedViews(page),
    queryFn: ({ signal }) =>
      apiFetch(`/api/saved-views?page=${page}`, savedViewListSchema, { signal }),
  });
export const notificationsQuery = (f: { unread: boolean; page: number }) =>
  queryOptions({
    queryKey: keys.notifications(f),
    queryFn: ({ signal }) =>
      apiFetch(
        `/api/notifications${query({ unread: f.unread ? "true" : undefined, page: f.page, limit: 20 })}`,
        notificationListSchema,
        { signal },
      ),
  });
export const unreadQuery = queryOptions({
  queryKey: keys.unread,
  queryFn: ({ signal }) =>
    apiFetch("/api/notifications/unread-count", unreadCountSchema, { signal }),
  refetchInterval: 60_000,
});
export const digestQuery = queryOptions({
  queryKey: keys.digest,
  queryFn: ({ signal }) => apiFetch("/api/digest", digestSettingSchema, { signal }),
});
export const alertRulesQuery = queryOptions({
  queryKey: keys.alertRules,
  queryFn: ({ signal }) => apiFetch("/api/alert-rules", alertRuleListSchema, { signal }),
});
export const alertFiringsQuery = queryOptions({
  queryKey: keys.alertFirings,
  queryFn: ({ signal }) => apiFetch("/api/alert-firings", alertFiringListSchema, { signal }),
});
export const pricesQuery = queryOptions({
  queryKey: keys.prices,
  queryFn: ({ signal }) => apiFetch("/api/billing/prices", billingPricesSchema, { signal }),
});
export const statementQuery = (month: string) =>
  queryOptions({
    queryKey: keys.statement(month),
    queryFn: ({ signal }) =>
      apiFetch(`/api/billing/statement?month=${month}`, statementSchema, { signal }),
  });
/** The public status page; it needs no sign-in, and refreshes every few minutes. */
export const statusQuery = queryOptions({
  queryKey: keys.status,
  queryFn: ({ signal }) => apiFetch("/api/status", statusSchema, { signal }),
  refetchInterval: 5 * 60_000,
});
export const membersQuery = queryOptions({
  queryKey: keys.members,
  queryFn: ({ signal }) => apiFetch("/api/members", memberListSchema, { signal }),
});
export const teamsQuery = queryOptions({
  queryKey: keys.teams,
  queryFn: ({ signal }) => apiFetch("/api/teams", teamSettingsListSchema, { signal }),
});
export const usageQuery = queryOptions({
  queryKey: keys.usage,
  queryFn: ({ signal }) => apiFetch("/api/usage", usageSchema, { signal }),
});
export const usageHistoryQuery = (days: number) =>
  queryOptions({
    queryKey: keys.usageHistory(days),
    queryFn: ({ signal }) =>
      apiFetch(`/api/usage/history?days=${String(days)}`, usageHistorySchema, { signal }),
  });
export const rubricQuery = queryOptions({
  queryKey: keys.rubric,
  queryFn: ({ signal }) => apiFetch("/api/rubrics/active", rubricSchema, { signal }),
});
/** The rubric that scores a product (its own or the default); null asks for the default. */
export const rubricForQuery = (productId: string | null) =>
  queryOptions({
    queryKey: keys.rubricFor(productId),
    queryFn: ({ signal }) =>
      apiFetch(`/api/rubrics/active${productId ? `?productId=${productId}` : ""}`, rubricSchema, {
        signal,
      }),
  });
/** A product's own versions, or the default's when productId is null. */
export const rubricVersionsQuery = (productId: string | null) =>
  queryOptions({
    queryKey: keys.rubricVersions(productId),
    queryFn: ({ signal }) =>
      apiFetch(`/api/rubrics${productId ? `?productId=${productId}` : ""}`, rubricListSchema, {
        signal,
      }),
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
  /** Calls from transcripts, with no audio (ADR-0030). */
  uploadTranscripts: (body: TranscriptUploadRequest) =>
    apiSend("/api/uploads/transcripts", uploadConfirmResponseSchema, "POST", body),
  audioUrl: (callId: string) => apiSend(`/api/calls/${callId}/audio-url`, audioUrlSchema, "POST"),
  /** A link that saves the recording under its original name. */
  audioDownloadUrl: (callId: string) =>
    apiSend(`/api/calls/${callId}/audio-url`, audioUrlSchema, "POST", { download: true }),
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
  archive: (callId: string) => apiSend(`/api/calls/${callId}/archive`, noContent, "POST"),
  unarchive: (callId: string) => apiSend(`/api/calls/${callId}/unarchive`, noContent, "POST"),
  deleteCall: (callId: string) => apiSend(`/api/calls/${callId}/delete`, noContent, "POST"),
  completeReview: (callId: string) =>
    apiSend(`/api/calls/${callId}/review/complete`, noContent, "POST"),
  updateBatch: (id: string, body: BatchUpdateRequest) =>
    apiSend(`/api/batches/${id}`, batchDetailSchema, "PATCH", body),
  retryBatch: (id: string) =>
    apiSend(`/api/batches/${id}/retry-failed`, batchRetryResponseSchema, "POST"),
  /** A five-minute link the browser can open to save a batch export; the URL is the API's. */
  batchExportLink: async (id: string, format: "csv" | "zip", include: BatchExportPart[] = []) => {
    const link = await apiSend(
      `/api/batches/${id}/export-link`,
      z.object({ url: z.string().startsWith("/api/exports?"), expiresInSeconds: z.number() }),
      "POST",
      { format, include },
    );
    return `${env.VITE_API_URL}${link.url}`;
  },
  createApiKey: (body: CreateApiKeyRequest) =>
    apiSend("/api/api-keys", createdApiKeySchema, "POST", body),
  updateApiKey: (id: string, body: UpdateApiKeyRequest) =>
    apiSend(`/api/api-keys/${id}`, apiKeySchema, "PATCH", body),
  revokeApiKey: (id: string) => apiSend(`/api/api-keys/${id}/revoke`, noContent, "POST"),
  rotateApiKey: (id: string) => apiSend(`/api/api-keys/${id}/rotate`, createdApiKeySchema, "POST"),
  revokeAllApiKeys: () =>
    apiSend("/api/api-keys/revoke-all", revokeAllKeysResponseSchema, "POST", {
      confirm: "REVOKE ALL",
    }),
  createWebhook: (body: CreateWebhookRequest) =>
    apiSend("/api/webhooks", createdWebhookSchema, "POST", body),
  updateWebhook: (id: string, body: UpdateWebhookRequest) =>
    apiSend(`/api/webhooks/${id}`, webhookEndpointSchema, "PATCH", body),
  deleteWebhook: (id: string) => apiSend(`/api/webhooks/${id}`, noContent, "DELETE"),
  testWebhook: (id: string) =>
    apiSend(`/api/webhooks/${id}/test`, z.object({ queued: z.number() }), "POST"),
  redeliverWebhook: (id: string, deliveryId: string) =>
    apiSend(
      `/api/webhooks/${id}/deliveries/${deliveryId}/redeliver`,
      z.object({ queued: z.number() }),
      "POST",
    ),
  setPrices: (body: BillingPrices) =>
    apiSend("/api/billing/prices", billingPricesSchema, "PUT", body),
  postNotice: (body: PostNoticeRequest) =>
    apiSend("/api/status/notices", z.object({ id: z.string() }), "POST", body),
  resolveNotice: (id: string) => apiSend(`/api/status/notices/${id}/resolve`, noContent, "POST"),
  inviteMember: (body: InviteMemberRequest) => apiSend("/api/members", memberSchema, "POST", body),
  updateMember: (id: string, body: UpdateMemberRequest) =>
    apiSend(`/api/members/${id}`, memberSchema, "PATCH", body),
  updateTeam: (id: string, body: { audioRetentionDays: number | null }) =>
    apiSend(`/api/teams/${id}`, teamSettingsSchema, "PATCH", body),
  saveView: (body: SaveViewRequest) => apiSend("/api/saved-views", savedViewSchema, "POST", body),
  updateView: (id: string, body: UpdateViewRequest) =>
    apiSend(`/api/saved-views/${id}`, savedViewSchema, "PATCH", body),
  deleteView: (id: string) => apiSend(`/api/saved-views/${id}`, noContent, "DELETE"),
  markRead: (id: string) => apiSend(`/api/notifications/${id}/read`, noContent, "POST"),
  markAllRead: () => apiSend("/api/notifications/read-all", z.object({ read: z.number() }), "POST"),
  updateMe: (body: UpdateMeRequest) => apiSend("/api/me", meSchema, "PATCH", body),
  setDigest: (frequency: "off" | "daily" | "weekly") =>
    apiSend("/api/digest", digestSettingSchema, "PUT", { frequency }),
  createAlertRule: (body: AlertRuleRequest) =>
    apiSend("/api/alert-rules", alertRuleSchema, "POST", body),
  updateAlertRule: (id: string, body: AlertRuleRequest) =>
    apiSend(`/api/alert-rules/${id}`, alertRuleSchema, "PUT", body),
  deleteAlertRule: (id: string) => apiSend(`/api/alert-rules/${id}`, noContent, "DELETE"),
  saveRubric: (name: string, items: RubricItem[], productId: string | null = null) =>
    apiSend("/api/rubrics", rubricSchema, "POST", { name, items, productId }),
};
