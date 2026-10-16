import type { ApiBucket, ApiKey, ApiScope } from "@scc/shared";

// Words for API keys, shared by the developer pages.

export const SCOPE_LABEL: Record<ApiScope, { label: string; hint: string }> = {
  "calls:read": {
    label: "Read calls",
    hint: "List calls, read transcripts and findings, get recordings",
  },
  "calls:write": { label: "Upload calls", hint: "Upload recordings, retry and archive calls" },
  "batches:read": { label: "Read batches", hint: "List batches and follow their progress" },
  "batches:write": { label: "Manage batches", hint: "Rename, archive and retry batches" },
  "exports:read": { label: "Export", hint: "Download batch results as CSV or ZIP" },
  "analytics:read": { label: "Analytics", hint: "Dashboard highlights and the leaderboard" },
};

export const BUCKET_LABEL: Record<ApiBucket, { label: string; per: string }> = {
  read: { label: "Reads", per: "per minute" },
  single: { label: "Single writes", per: "per minute" },
  batch: { label: "Batch work", per: "per minute" },
  bulk: { label: "Bulk exports", per: "per hour" },
};

export type KeyStatus = "active" | "revoked" | "expired";

export function keyStatus(key: ApiKey, now = Date.now()): KeyStatus {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt && Date.parse(key.expiresAt) <= now) return "expired";
  return "active";
}

/** How a key is shown in place of its secret. */
export const maskedKey = (prefix: string) => `latte_${prefix}_••••`;

export const STATUS_BADGE: Record<
  KeyStatus,
  { label: string; variant: "success" | "secondary" | "warning" }
> = {
  active: { label: "Active", variant: "success" },
  revoked: { label: "Revoked", variant: "secondary" },
  expired: { label: "Expired", variant: "warning" },
};
