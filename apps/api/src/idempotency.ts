import { createHash } from "node:crypto";

import type { RequestHandler } from "express";

import type { Pool } from "./db/pool.ts";
import { AppError } from "./errors.ts";

// Idempotency keys (ADR-0022). A create request sent with `Idempotency-Key`
// is remembered with its response for 24 hours, per caller: the same key and
// body replays the response, the same key with another body is refused, and
// a key still in flight answers 409. A 5xx is not remembered, so a retry can
// succeed. The record is not written in the handler's transaction; the hard
// guards against doubles (a storage path confirmed once, a row lock) stay.

const KEY = /^[\w.:-]{1,255}$/;
/** The create routes that honour the header, as method and path pattern. */
const ROUTES: [string, RegExp][] = [
  ["POST", /^\/uploads\/confirm$/],
  ["POST", /^\/api-keys$/],
  ["POST", /^\/webhooks$/],
  ["POST", /^\/batches\/[0-9a-fA-F-]{36}\/retry-failed$/],
  ["POST", /^\/saved-views$/],
  ["POST", /^\/alert-rules$/],
];

export function idempotency(pool: Pool): RequestHandler {
  return async (req, res, next) => {
    const key = req.get("Idempotency-Key");
    if (key === undefined || !ROUTES.some(([m, p]) => m === req.method && p.test(req.path))) {
      next();
      return;
    }
    if (!KEY.test(key)) {
      throw new AppError(
        "Idempotency-Key must be 1 to 255 letters, digits or . : _ -",
        400,
        "bad_idempotency_key",
      );
    }
    const owner = req.apiKey ? `key:${req.apiKey.id}` : `user:${req.user?.id ?? "anonymous"}`;
    const hash = createHash("sha256")
      .update(`${req.method} ${req.path} ${JSON.stringify(req.body ?? null)}`)
      .digest("hex");

    // A record older than a day no longer counts: clear it so the key can be used again.
    await pool.query(
      "DELETE FROM idempotency_keys WHERE owner = $1 AND key = $2 AND created_at < now() - interval '24 hours'",
      [owner, key],
    );
    const claimed = await pool.query(
      `INSERT INTO idempotency_keys (owner, key, method, route, request_hash)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (owner, key) DO NOTHING`,
      [owner, key, req.method, req.path, hash],
    );
    if (claimed.rowCount === 0) {
      const { rows } = await pool.query<{
        request_hash: string;
        status: "in_progress" | "done";
        response_status: number | null;
        response_body: unknown;
      }>(
        "SELECT request_hash, status, response_status, response_body FROM idempotency_keys WHERE owner = $1 AND key = $2",
        [owner, key],
      );
      const seen = rows[0];
      if (!seen) {
        throw new AppError(
          "that Idempotency-Key is being cleared; retry",
          409,
          "idempotency_in_progress",
        );
      }
      if (seen.status === "in_progress") {
        throw new AppError(
          "a request with this Idempotency-Key is still running",
          409,
          "idempotency_in_progress",
        );
      }
      if (seen.request_hash !== hash) {
        throw new AppError(
          "this Idempotency-Key was used with a different request",
          422,
          "idempotency_key_reused",
        );
      }
      res.setHeader("Idempotent-Replayed", "true");
      res.status(seen.response_status ?? 200).json(seen.response_body);
      return;
    }

    // Remember the JSON this request answers with.
    const send = res.json.bind(res);
    let body: unknown = null;
    res.json = (value: unknown) => {
      body = value;
      return send(value);
    };
    res.on("finish", () => {
      const done =
        res.statusCode >= 500
          ? pool.query("DELETE FROM idempotency_keys WHERE owner = $1 AND key = $2", [owner, key])
          : pool.query(
              `UPDATE idempotency_keys SET status = 'done', response_status = $3, response_body = $4
                WHERE owner = $1 AND key = $2`,
              [owner, key, res.statusCode, JSON.stringify(body)],
            );
      done.catch((error: unknown) => {
        req.log.warn({ err: error }, "could not record an idempotent response");
      });
    });
    next();
  };
}
