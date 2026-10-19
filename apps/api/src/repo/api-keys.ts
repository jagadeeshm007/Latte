import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import {
  API_BUCKETS,
  BUCKET_WINDOW_SECONDS,
  DEFAULT_BUCKET_LIMITS,
  type ApiBucket,
  type ApiKey,
  type ApiKeyLogs,
  type ApiKeyMetrics,
  type ApiScope,
  type BucketLimits,
} from "@scc/shared";

import type { Queryable } from "../db/pool.ts";

// API keys (ADR-0018): `latte_<prefix>_<secret>`. The prefix finds the row; the
// secret is checked against its SHA-256 hash in constant time. Requests made
// with a key are counted per bucket in fixed windows and logged by route.

export const KEY_PREFIX = "latte_";
const TOKEN = /^latte_([a-z0-9]{8})_([A-Za-z0-9_-]{43})$/;
const PREFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
/** Requests are kept this long for logs and metrics. */
export const REQUEST_LOG_DAYS = 30;

const sha256 = (text: string) => createHash("sha256").update(text).digest();

/** newKey makes a fresh key: the full token is shown once, only the hash is kept. */
export function newKey(): { prefix: string; token: string; hash: Buffer } {
  const prefix = Array.from(randomBytes(8), (b) => PREFIX_ALPHABET[b % 36]).join("");
  const secret = randomBytes(32).toString("base64url");
  return { prefix, token: `${KEY_PREFIX}${prefix}_${secret}`, hash: sha256(secret) };
}

export const looksLikeKey = (token: string) => token.startsWith(KEY_PREFIX);

export interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  limits: BucketLimits;
  created_by: string;
  created_at: Date;
  last_used_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
}

const KEY_COLUMNS =
  "k.id, k.name, k.prefix, k.scopes, k.limits, k.created_by, k.created_at, k.last_used_at, k.expires_at, k.revoked_at";

/** findKeyByToken returns the key a token names when its secret matches, live or not; null otherwise. */
export async function findKeyByToken(db: Queryable, token: string): Promise<KeyRow | null> {
  const match = TOKEN.exec(token);
  if (!match?.[1] || !match[2]) return null;
  const { rows } = await db.query<KeyRow & { secret_hash: Buffer }>(
    `SELECT ${KEY_COLUMNS}, k.secret_hash FROM api_keys k WHERE k.prefix = $1`,
    [match[1]],
  );
  const row = rows[0];
  if (!row) return null;
  const given = sha256(match[2]);
  if (!timingSafeEqual(given, row.secret_hash)) return null;
  const { secret_hash: _hash, ...key } = row;
  return key;
}

/** keyProblem says why a key cannot be used now, or null when it can. */
export function keyProblem(key: KeyRow, now = new Date()): string | null {
  if (key.revoked_at) return "this API key has been revoked";
  if (key.expires_at && key.expires_at <= now) return "this API key has expired";
  return null;
}

export function effectiveLimits(limits: BucketLimits): Record<ApiBucket, number> {
  return {
    read: limits.read ?? DEFAULT_BUCKET_LIMITS.read,
    single: limits.single ?? DEFAULT_BUCKET_LIMITS.single,
    batch: limits.batch ?? DEFAULT_BUCKET_LIMITS.batch,
    bulk: limits.bulk ?? DEFAULT_BUCKET_LIMITS.bulk,
  };
}

/** touchKey records use at most once a minute, so busy keys do not write on every request. */
export async function touchKey(db: Queryable, id: string): Promise<void> {
  await db.query(
    `UPDATE api_keys SET last_used_at = now()
      WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')`,
    [id],
  );
}

export async function insertKey(
  db: Queryable,
  k: {
    name: string;
    scopes: ApiScope[];
    limits: BucketLimits;
    createdBy: string;
    expiresInDays: number | null;
  },
): Promise<{ id: string; token: string }> {
  const fresh = newKey();
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO api_keys (name, prefix, secret_hash, scopes, limits, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7::int IS NULL THEN NULL ELSE now() + make_interval(days => $7::int) END)
     RETURNING id`,
    [
      k.name,
      fresh.prefix,
      fresh.hash,
      k.scopes,
      JSON.stringify(k.limits),
      k.createdBy,
      k.expiresInDays,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("insert into api_keys returned no row");
  return { id: row.id, token: fresh.token };
}

function toApiKey(r: KeyRow & { created_by_name: string; requests_24h: number }): ApiKey {
  return {
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    scopes: r.scopes,
    limits: effectiveLimits(r.limits),
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: r.created_at.toISOString(),
    lastUsedAt: r.last_used_at?.toISOString() ?? null,
    expiresAt: r.expires_at?.toISOString() ?? null,
    revokedAt: r.revoked_at?.toISOString() ?? null,
    requests24h: r.requests_24h,
  };
}

const LIST_SELECT = `
  SELECT ${KEY_COLUMNS}, p.display_name AS created_by_name,
         (SELECT count(*)::int FROM api_requests r
           WHERE r.api_key_id = k.id AND r.created_at > now() - interval '24 hours') AS requests_24h
    FROM api_keys k JOIN profiles p ON p.id = k.created_by`;

export async function listKeys(db: Queryable): Promise<ApiKey[]> {
  const { rows } = await db.query<KeyRow & { created_by_name: string; requests_24h: number }>(
    `${LIST_SELECT} ORDER BY (k.revoked_at IS NOT NULL), k.created_at DESC, k.id`,
  );
  return rows.map(toApiKey);
}

export async function getKey(db: Queryable, id: string): Promise<ApiKey | null> {
  const { rows } = await db.query<KeyRow & { created_by_name: string; requests_24h: number }>(
    `${LIST_SELECT} WHERE k.id = $1`,
    [id],
  );
  return rows[0] ? toApiKey(rows[0]) : null;
}

export async function updateKey(
  db: Queryable,
  id: string,
  patch: { name?: string | undefined; limits?: BucketLimits | undefined },
): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE api_keys SET name = coalesce($2, name), limits = coalesce($3::jsonb, limits)
      WHERE id = $1 AND revoked_at IS NULL`,
    [id, patch.name ?? null, patch.limits ? JSON.stringify(patch.limits) : null],
  );
  return rowCount === 1;
}

/** Hours the old key keeps working after a rotation, so deploys can swap keys without downtime. */
export const ROTATION_GRACE_HOURS = 24;

/**
 * rotateKey makes a successor with the same name, scopes, limits and expiry,
 * and lets the old key run out after the grace period. The old row is locked,
 * so two rotations at once cannot both succeed. Null when the key is not live.
 */
export async function rotateKey(
  db: Queryable,
  id: string,
  rotatedBy: string,
): Promise<{ id: string; token: string } | null> {
  const { rows } = await db.query<KeyRow>(
    `SELECT ${KEY_COLUMNS} FROM api_keys k
      WHERE k.id = $1 AND k.revoked_at IS NULL AND (k.expires_at IS NULL OR k.expires_at > now())
        FOR UPDATE`,
    [id],
  );
  const old = rows[0];
  if (!old) return null;
  const fresh = newKey();
  const inserted = await db.query<{ id: string }>(
    `INSERT INTO api_keys (name, prefix, secret_hash, scopes, limits, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      old.name,
      fresh.prefix,
      fresh.hash,
      old.scopes,
      JSON.stringify(old.limits),
      rotatedBy,
      old.expires_at,
    ],
  );
  await db.query(
    `UPDATE api_keys
        SET expires_at = least(coalesce(expires_at, 'infinity'), now() + make_interval(hours => $2))
      WHERE id = $1`,
    [id, ROTATION_GRACE_HOURS],
  );
  const row = inserted.rows[0];
  if (!row) throw new Error("insert into api_keys returned no row");
  return { id: row.id, token: fresh.token };
}

/** revokeAllKeys stops every live key at once and returns how many it stopped. */
export async function revokeAllKeys(db: Queryable): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    "UPDATE api_keys SET revoked_at = now() WHERE revoked_at IS NULL RETURNING id",
  );
  return rows.map((r) => r.id);
}

/** revokeKey stops a key for good; revoking twice changes nothing. */
export async function revokeKey(db: Queryable, id: string): Promise<boolean> {
  const { rowCount } = await db.query(
    "UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL",
    [id],
  );
  return rowCount === 1;
}

/**
 * countRequest adds one request to the key's current window for the bucket
 * and returns the count so far and when the window ends. One upsert, so two
 * processes counting at once both see the right total.
 */
export async function countRequest(
  db: Queryable,
  keyId: string,
  bucket: ApiBucket,
): Promise<{ count: number; resetAt: number }> {
  const window = BUCKET_WINDOW_SECONDS[bucket];
  const { rows } = await db.query<{ count: number; window_start: number }>(
    `INSERT INTO rate_limit_windows (api_key_id, bucket, window_start, count)
     VALUES ($1, $2, to_timestamp(floor(extract(epoch FROM now()) / $3) * $3), 1)
     ON CONFLICT (api_key_id, bucket, window_start)
       DO UPDATE SET count = rate_limit_windows.count + 1
     RETURNING count, extract(epoch FROM window_start)::bigint AS window_start`,
    [keyId, bucket, window],
  );
  const row = rows[0];
  if (!row) throw new Error("rate limit upsert returned no row");
  return { count: row.count, resetAt: row.window_start + window };
}

export async function logRequest(
  db: Queryable,
  r: {
    keyId: string;
    method: string;
    route: string;
    bucket: ApiBucket;
    status: number;
    durationMs: number;
    requestId: string;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO api_requests (api_key_id, method, route, bucket, status, duration_ms, request_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [r.keyId, r.method, r.route, r.bucket, r.status, Math.round(r.durationMs), r.requestId],
  );
}

const ms = (n: number | null) => (n === null ? null : Math.round(n));

/** keyMetrics: a key's traffic per day, totals, use against each bucket's limit, and per route. */
export async function keyMetrics(db: Queryable, key: ApiKey, days: number): Promise<ApiKeyMetrics> {
  const since = [key.id, days];
  const range = `api_key_id = $1 AND created_at > now() - make_interval(days => $2::int)`;
  const [perDay, totals, buckets, windows, routes, usage] = await Promise.all([
    db.query<{
      day: string;
      ok: number;
      client_errors: number;
      server_errors: number;
      rate_limited: number;
      p95: number | null;
    }>(
      `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
              (count(*) FILTER (WHERE status < 400))::int AS ok,
              (count(*) FILTER (WHERE status >= 400 AND status < 500 AND status <> 429))::int AS client_errors,
              (count(*) FILTER (WHERE status >= 500))::int AS server_errors,
              (count(*) FILTER (WHERE status = 429))::int AS rate_limited,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95
         FROM api_requests WHERE ${range} GROUP BY 1 ORDER BY 1`,
      since,
    ),
    db.query<{ requests: number; errors: number; p50: number | null; p95: number | null }>(
      `SELECT count(*)::int AS requests, (count(*) FILTER (WHERE status >= 400))::int AS errors,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95
         FROM api_requests WHERE ${range}`,
      since,
    ),
    db.query<{ bucket: ApiBucket; requests: number }>(
      `SELECT bucket, count(*)::int AS requests FROM api_requests WHERE ${range} GROUP BY 1`,
      since,
    ),
    db.query<{ bucket: ApiBucket; count: number; window_start: number }>(
      `SELECT DISTINCT ON (bucket) bucket, count, extract(epoch FROM window_start)::bigint AS window_start
         FROM rate_limit_windows
        WHERE api_key_id = $1 ORDER BY bucket, window_start DESC`,
      [key.id],
    ),
    db.query<{
      method: string;
      route: string;
      requests: number;
      errors: number;
      p95: number | null;
    }>(
      `SELECT method, route, count(*)::int AS requests,
              (count(*) FILTER (WHERE status >= 400))::int AS errors,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95
         FROM api_requests WHERE ${range}
        GROUP BY 1, 2 ORDER BY 3 DESC, 2 LIMIT 20`,
      since,
    ),
    db.query<{ uploaded: number; scored: number; cost_usd: number }>(
      `SELECT count(c.id)::int AS uploaded,
              (count(c.id) FILTER (WHERE c.status = 'scored'))::int AS scored,
              coalesce((SELECT sum(m.cost_usd) FROM model_calls m
                          JOIN calls mc ON mc.id = m.call_id
                          JOIN batches mb ON mb.id = mc.batch_id
                         WHERE mb.api_key_id = $1
                           AND m.created_at > now() - make_interval(days => $2::int)), 0) AS cost_usd
         FROM calls c JOIN batches b ON b.id = c.batch_id
        WHERE b.api_key_id = $1 AND c.deleted_at IS NULL
          AND c.created_at > now() - make_interval(days => $2::int)`,
      since,
    ),
  ]);
  const t = totals.rows[0] ?? { requests: 0, errors: 0, p50: null, p95: null };
  const now = Date.now() / 1000;
  return {
    days: perDay.rows.map((d) => ({
      day: d.day,
      ok: d.ok,
      clientErrors: d.client_errors,
      serverErrors: d.server_errors,
      rateLimited: d.rate_limited,
      p95Ms: ms(d.p95),
    })),
    totals: {
      requests: t.requests,
      errorRate: t.requests ? Math.round((t.errors / t.requests) * 1000) / 1000 : null,
      p50Ms: ms(t.p50),
      p95Ms: ms(t.p95),
    },
    buckets: API_BUCKETS.map((bucket) => {
      const window = BUCKET_WINDOW_SECONDS[bucket];
      const latest = windows.rows.find((w) => w.bucket === bucket);
      const start = Math.floor(now / window) * window;
      return {
        bucket,
        requests: buckets.rows.find((b) => b.bucket === bucket)?.requests ?? 0,
        limit: key.limits[bucket],
        windowSeconds: window,
        // A window that has ended counts as nothing used.
        used: latest?.window_start === start ? latest.count : 0,
      };
    }),
    usage: {
      callsUploaded: usage.rows[0]?.uploaded ?? 0,
      callsScored: usage.rows[0]?.scored ?? 0,
      costUsd: Math.round((usage.rows[0]?.cost_usd ?? 0) * 10_000) / 10_000,
    },
    routes: routes.rows.map((r) => ({
      method: r.method,
      route: r.route,
      requests: r.requests,
      errors: r.errors,
      p95Ms: ms(r.p95),
    })),
  };
}

const STATUS_SQL = {
  "2xx": "status < 400",
  "4xx": "status >= 400 AND status < 500",
  "5xx": "status >= 500",
  "429": "status = 429",
} as const;

export async function keyLogs(
  db: Queryable,
  keyId: string,
  f: {
    status?: keyof typeof STATUS_SQL | undefined;
    bucket?: ApiBucket | undefined;
    page: number;
    limit: number;
  },
): Promise<ApiKeyLogs> {
  const where = ["api_key_id = $1"];
  const params: unknown[] = [keyId];
  if (f.status) where.push(STATUS_SQL[f.status]);
  if (f.bucket) {
    params.push(f.bucket);
    where.push(`bucket = $${String(params.length)}`);
  }
  const filtered = where.join(" AND ");
  const pageParams = [...params, f.limit, (f.page - 1) * f.limit];
  const [rows, count] = await Promise.all([
    db.query<{
      id: number;
      method: string;
      route: string;
      bucket: ApiBucket;
      status: number;
      duration_ms: number;
      request_id: string;
      created_at: Date;
    }>(
      `SELECT id, method, route, bucket, status, duration_ms, request_id, created_at
         FROM api_requests WHERE ${filtered}
        ORDER BY created_at DESC, id DESC
        LIMIT $${String(pageParams.length - 1)} OFFSET $${String(pageParams.length)}`,
      pageParams,
    ),
    db.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM api_requests WHERE ${filtered}`,
      params,
    ),
  ]);
  return {
    items: rows.rows.map((r) => ({
      id: r.id,
      method: r.method,
      route: r.route,
      bucket: r.bucket,
      status: r.status,
      durationMs: r.duration_ms,
      requestId: r.request_id,
      createdAt: r.created_at.toISOString(),
    })),
    total: count.rows[0]?.total ?? 0,
  };
}

/** purgeApiTraffic drops request logs past their keeping time and rate windows over a day old. */
export async function purgeApiTraffic(db: Queryable): Promise<number> {
  const { rowCount } = await db.query(
    "DELETE FROM api_requests WHERE created_at < now() - make_interval(days => $1)",
    [REQUEST_LOG_DAYS],
  );
  await db.query("DELETE FROM rate_limit_windows WHERE window_start < now() - interval '1 day'");
  return rowCount ?? 0;
}
