import { apiFetch } from "@/lib/api";

import { healthSchema, type Health } from "./schemas";

/** fetchHealth reads GET /healthz on the API. */
export function fetchHealth(init: Pick<RequestInit, "signal"> = {}): Promise<Health> {
  return apiFetch("/healthz", healthSchema, init);
}
