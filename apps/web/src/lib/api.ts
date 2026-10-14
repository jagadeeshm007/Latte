import type { z } from "zod";

import { env } from "@/lib/env";

export type ApiErrorCode = "network" | "http" | "invalid_json" | "invalid_response";

/** ApiError is the only error apiFetch throws; consumers switch on code and status. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ApiErrorCode, status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * apiFetch calls the API, validates the JSON body with the schema and returns
 * the typed value. Pass the query's signal so navigation cancels the request.
 */
export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_URL}${path}`, { ...init, headers });
  } catch (cause) {
    throw new ApiError("network", 0, `${method} ${path}: network error`, cause);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ApiError(
      "http",
      response.status,
      `${method} ${path}: ${String(response.status)} ${response.statusText}`.trim(),
      body,
    );
  }

  // 204 and 205 have no body: the schema decides whether none is acceptable
  // (z.undefined() for a DELETE), so a no-content call still checks its status.
  if (response.status === 204 || response.status === 205) {
    const parsed = schema.safeParse(undefined);
    if (!parsed.success) {
      throw new ApiError(
        "invalid_response",
        response.status,
        `${method} ${path}: expected a body, got ${String(response.status)}`,
        parsed.error.issues,
      );
    }
    return parsed.data;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    throw new ApiError(
      "invalid_json",
      response.status,
      `${method} ${path}: body is not JSON`,
      cause,
    );
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(
      "invalid_response",
      response.status,
      `${method} ${path}: response failed validation`,
      parsed.error.issues,
    );
  }
  return parsed.data;
}
