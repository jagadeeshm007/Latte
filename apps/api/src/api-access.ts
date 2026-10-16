import { BUCKET_WINDOW_SECONDS, type ApiBucket, type ApiScope } from "@scc/shared";
import type { Request, RequestHandler } from "express";

import type { Pool } from "./db/pool.ts";
import { AppError } from "./errors.ts";
import { countRequest, logRequest, touchKey } from "./repo/api-keys.ts";

// What an API key may reach (ADR-0018). Default deny: a key reaches only the
// routes listed here, each with the scope it needs and the rate-limit bucket
// it counts against. Reviews, rubrics, spend and key management stay with
// people signed in to the app.

interface Rule {
  method: string;
  path: RegExp;
  /** The route as logged: a template, never the path with its ids. */
  route: string;
  /** null: any key may call it (who am I). */
  scope: ApiScope | null;
  bucket: ApiBucket | ((req: Request) => ApiBucket);
}

const ID = "[0-9a-fA-F-]{36}";
const rule = (
  method: string,
  route: string,
  scope: ApiScope | null,
  bucket: Rule["bucket"],
): Rule => ({
  method,
  route,
  scope,
  bucket,
  path: new RegExp(`^${route.replaceAll(/:\w+/g, ID).replaceAll(".", "\\.")}$`),
});

/** Uploads of more than ten files, or into an existing batch, are batch work. */
function uploadBucket(req: Request): ApiBucket {
  const body: unknown = req.body;
  if (typeof body !== "object" || body === null) return "single";
  const files = "files" in body && Array.isArray(body.files) ? body.files.length : 0;
  return files > 10 || ("batchId" in body && body.batchId !== undefined) ? "batch" : "single";
}

export const API_KEY_ROUTES: Rule[] = [
  rule("GET", "/me", null, "read"),
  rule("GET", "/reference", "calls:read", "read"),
  rule("GET", "/calls", "calls:read", "read"),
  rule("GET", "/calls/:id", "calls:read", "read"),
  rule("POST", "/calls/:id/audio-url", "calls:read", "read"),
  rule("POST", "/uploads/sign", "calls:write", uploadBucket),
  rule("POST", "/uploads/confirm", "calls:write", uploadBucket),
  rule("POST", "/calls/:id/retry", "calls:write", "single"),
  rule("POST", "/calls/:id/archive", "calls:write", "single"),
  rule("POST", "/calls/:id/unarchive", "calls:write", "single"),
  rule("GET", "/batches", "batches:read", "read"),
  rule("GET", "/batches/:id", "batches:read", "read"),
  rule("PATCH", "/batches/:id", "batches:write", "single"),
  rule("POST", "/batches/:id/retry-failed", "batches:write", "batch"),
  rule("GET", "/batches/:id/results.csv", "exports:read", "bulk"),
  rule("GET", "/batches/:id/export.zip", "exports:read", "bulk"),
  rule("GET", "/dashboard", "analytics:read", "read"),
  rule("GET", "/dashboard/highlights", "analytics:read", "read"),
  rule("GET", "/dashboard/leaderboard", "analytics:read", "read"),
];

export function matchRule(method: string, path: string): Rule | undefined {
  return API_KEY_ROUTES.find((r) => r.method === method && r.path.test(path));
}

/**
 * apiKeyGate runs after authenticate. For a request made with a key it counts
 * the request against its bucket (refusing it with 429 and Retry-After past
 * the limit) and sets the RateLimit headers, then checks the route and scope,
 * and logs the request when the response is sent. Requests from people pass.
 */
export function apiKeyGate(pool: Pool): RequestHandler {
  return async (req, res, next) => {
    const key = req.apiKey;
    if (!key) {
      next();
      return;
    }
    const started = performance.now();
    const match = matchRule(req.method, req.path);
    const bucket = match
      ? typeof match.bucket === "function"
        ? match.bucket(req)
        : match.bucket
      : "read";
    res.on("finish", () => {
      logRequest(pool, {
        keyId: key.id,
        method: req.method,
        route: match?.route ?? "(not available to API keys)",
        bucket,
        status: res.statusCode,
        durationMs: performance.now() - started,
        requestId: typeof req.id === "object" ? JSON.stringify(req.id) : String(req.id),
      })
        .then(() => touchKey(pool, key.id))
        .catch((error: unknown) => {
          req.log.warn({ err: error, apiKeyId: key.id }, "could not log an API key request");
        });
    });

    // Counted before any check, so refused requests spend the limit too: a key
    // cannot send unlimited requests (each one logged) by aiming at routes it may not use.
    const limit = key.limits[bucket];
    const { count, resetAt } = await countRequest(pool, key.id, bucket);
    const resetIn = Math.max(1, Math.ceil(resetAt - Date.now() / 1000));
    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - count)));
    res.setHeader("RateLimit-Reset", String(resetIn));
    res.setHeader(
      "RateLimit-Policy",
      `${String(limit)};w=${String(BUCKET_WINDOW_SECONDS[bucket])}`,
    );
    if (count > limit) {
      res.setHeader("Retry-After", String(resetIn));
      throw new AppError(
        `this API key is over its ${bucket} limit of ${String(limit)} requests; retry in ${String(resetIn)} s`,
        429,
        "rate_limited",
        { bucket, limit, retryAfterSeconds: resetIn },
      );
    }
    if (!match) {
      throw new AppError("this endpoint is not available to API keys", 403, "not_for_api_keys");
    }
    if (match.scope && !key.scopes.includes(match.scope)) {
      throw new AppError(`this API key needs the ${match.scope} scope`, 403, "insufficient_scope");
    }
    next();
  };
}
