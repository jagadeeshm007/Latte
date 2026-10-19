import { randomUUID } from "node:crypto";

import type { WebhookDelivery, WebhookEndpoint, WebhookEvent } from "@scc/shared";

import type { Queryable } from "../db/pool.ts";

// Webhooks (ADR-0021): endpoints, and the outbox of deliveries. An event is
// written as one delivery row per subscribed endpoint, in the transaction of
// the change it announces; the sender claims due rows with SKIP LOCKED, so
// two senders never deliver the same row twice at once.

/** Seconds to wait before attempt n + 1; after the last, the delivery fails (about 23 hours in all). */
export const RETRY_DELAYS = [30, 120, 600, 1800, 3600, 3 * 3600, 6 * 3600, 12 * 3600];
/** An endpoint that fails this many deliveries in a row is switched off until someone turns it back on. */
export const DISABLE_AFTER_FAILURES = 50;

interface EndpointRow {
  id: string;
  url: string;
  description: string;
  events: WebhookEvent[];
  secret_ciphertext: string;
  created_by: string;
  created_at: Date;
  disabled_at: Date | null;
  disabled_reason: string | null;
  consecutive_failures: number;
  deliveries_24h: number;
  failures_24h: number;
}

const ENDPOINT_SELECT = `
  SELECT e.*,
         (SELECT count(*)::int FROM webhook_deliveries d
           WHERE d.endpoint_id = e.id AND d.created_at > now() - interval '24 hours') AS deliveries_24h,
         (SELECT count(*)::int FROM webhook_deliveries d
           WHERE d.endpoint_id = e.id AND d.created_at > now() - interval '24 hours'
             AND d.status = 'failed') AS failures_24h
    FROM webhook_endpoints e`;

function toEndpoint(r: EndpointRow): WebhookEndpoint {
  return {
    id: r.id,
    url: r.url,
    description: r.description,
    events: r.events.filter((e): e is Exclude<WebhookEvent, "ping"> => e !== "ping"),
    createdBy: r.created_by,
    createdAt: r.created_at.toISOString(),
    disabledAt: r.disabled_at?.toISOString() ?? null,
    disabledReason: r.disabled_reason,
    consecutiveFailures: r.consecutive_failures,
    deliveries24h: r.deliveries_24h,
    failures24h: r.failures_24h,
  };
}

export async function listEndpoints(db: Queryable): Promise<WebhookEndpoint[]> {
  const { rows } = await db.query<EndpointRow>(
    `${ENDPOINT_SELECT} ORDER BY e.created_at DESC, e.id`,
  );
  return rows.map(toEndpoint);
}

export async function getEndpoint(db: Queryable, id: string): Promise<WebhookEndpoint | null> {
  const { rows } = await db.query<EndpointRow>(`${ENDPOINT_SELECT} WHERE e.id = $1`, [id]);
  return rows[0] ? toEndpoint(rows[0]) : null;
}

export async function insertEndpoint(
  db: Queryable,
  e: {
    url: string;
    description: string;
    events: WebhookEvent[];
    secretCiphertext: string;
    createdBy: string;
  },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO webhook_endpoints (url, description, events, secret_ciphertext, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [e.url, e.description, e.events, e.secretCiphertext, e.createdBy],
  );
  const row = rows[0];
  if (!row) throw new Error("insert into webhook_endpoints returned no row");
  return row.id;
}

export async function updateEndpoint(
  db: Queryable,
  id: string,
  p: {
    url?: string | undefined;
    description?: string | undefined;
    events?: WebhookEvent[] | undefined;
    enabled?: boolean | undefined;
  },
): Promise<void> {
  await db.query(
    `UPDATE webhook_endpoints
        SET url = coalesce($2, url),
            description = coalesce($3, description),
            events = coalesce($4, events),
            disabled_at = CASE WHEN $5::boolean IS NULL THEN disabled_at
                               WHEN $5 THEN NULL ELSE coalesce(disabled_at, now()) END,
            disabled_reason = CASE WHEN $5::boolean IS NULL THEN disabled_reason
                                   WHEN $5 THEN NULL ELSE 'turned off by a manager' END,
            consecutive_failures = CASE WHEN $5 THEN 0 ELSE consecutive_failures END
      WHERE id = $1`,
    [id, p.url ?? null, p.description ?? null, p.events ?? null, p.enabled ?? null],
  );
}

export async function deleteEndpoint(db: Queryable, id: string): Promise<boolean> {
  const { rowCount } = await db.query("DELETE FROM webhook_endpoints WHERE id = $1", [id]);
  return rowCount === 1;
}

/**
 * emitEvent writes one pending delivery per live endpoint subscribed to the
 * event (or only to `onlyEndpoint`, for a test ping). Call it inside the
 * transaction that makes the change, so the event exists exactly when the
 * change does.
 */
export async function emitEvent(
  db: Queryable,
  type: WebhookEvent,
  data: Record<string, unknown>,
  onlyEndpoint?: string,
): Promise<number> {
  const eventId = randomUUID();
  const payload = { id: eventId, type, createdAt: new Date().toISOString(), data };
  const { rowCount } = await db.query(
    `INSERT INTO webhook_deliveries (endpoint_id, event_id, event_type, payload)
     SELECT e.id, $1, $2, $3 FROM webhook_endpoints e
      WHERE e.disabled_at IS NULL
        AND ($4::uuid IS NULL AND $2 = ANY (e.events) OR e.id = $4::uuid)`,
    [eventId, type, JSON.stringify(payload), onlyEndpoint ?? null],
  );
  return rowCount ?? 0;
}

export interface DueDelivery {
  id: string;
  endpoint_id: string;
  url: string;
  secret_ciphertext: string;
  event_type: string;
  event_id: string;
  payload: unknown;
  attempts: number;
}

/** claimDue takes up to `limit` due deliveries and pushes their next attempt out, so no one else sends them. */
export async function claimDue(db: Queryable, limit: number): Promise<DueDelivery[]> {
  const { rows } = await db.query<DueDelivery>(
    `WITH due AS (
       SELECT d.id FROM webhook_deliveries d
         JOIN webhook_endpoints e ON e.id = d.endpoint_id AND e.disabled_at IS NULL
        WHERE d.status = 'pending' AND d.next_attempt_at <= now()
        ORDER BY d.next_attempt_at
        LIMIT $1
        FOR UPDATE OF d SKIP LOCKED)
     UPDATE webhook_deliveries d SET next_attempt_at = now() + interval '5 minutes'
       FROM due, webhook_endpoints e
      WHERE d.id = due.id AND e.id = d.endpoint_id
     RETURNING d.id, d.endpoint_id, e.url, e.secret_ciphertext, d.event_type, d.event_id, d.payload, d.attempts`,
    [limit],
  );
  return rows;
}

/** recordAttempt stores the outcome of one attempt and schedules the next, or gives up. */
export async function recordAttempt(
  db: Queryable,
  d: { id: string; endpointId: string; attempts: number },
  outcome: { ok: boolean; status: number | null; error: string | null },
): Promise<"succeeded" | "pending" | "failed"> {
  const attempts = d.attempts + 1;
  const delay = RETRY_DELAYS[attempts - 1];
  const status = outcome.ok ? "succeeded" : delay === undefined ? "failed" : "pending";
  await db.query(
    `UPDATE webhook_deliveries
        SET status = $2, attempts = $3, last_status = $4, last_error = $5,
            delivered_at = CASE WHEN $2 = 'succeeded' THEN now() ELSE delivered_at END,
            next_attempt_at = now() + make_interval(secs => $6)
      WHERE id = $1`,
    [d.id, status, attempts, outcome.status, outcome.error?.slice(0, 500) ?? null, delay ?? 0],
  );
  await db.query(
    `UPDATE webhook_endpoints
        SET consecutive_failures = CASE WHEN $2 THEN 0 ELSE consecutive_failures + 1 END,
            disabled_at = CASE WHEN NOT $2 AND consecutive_failures + 1 >= $3 THEN coalesce(disabled_at, now())
                               ELSE disabled_at END,
            disabled_reason = CASE WHEN NOT $2 AND consecutive_failures + 1 >= $3
                                   THEN coalesce(disabled_reason, 'turned off after ' || $3 || ' failed deliveries in a row')
                                   ELSE disabled_reason END
      WHERE id = $1`,
    [d.endpointId, outcome.ok, DISABLE_AFTER_FAILURES],
  );
  return status;
}

export async function listDeliveries(
  db: Queryable,
  endpointId: string,
  f: { status?: "pending" | "succeeded" | "failed" | undefined; page: number; limit: number },
): Promise<{ items: WebhookDelivery[]; total: number }> {
  const params: unknown[] = [endpointId];
  let where = "endpoint_id = $1";
  if (f.status) {
    params.push(f.status);
    where += " AND status = $2";
  }
  const [rows, count] = await Promise.all([
    db.query<{
      id: string;
      event_id: string;
      event_type: string;
      status: "pending" | "succeeded" | "failed";
      attempts: number;
      last_status: number | null;
      last_error: string | null;
      next_attempt_at: Date;
      delivered_at: Date | null;
      created_at: Date;
      payload: unknown;
    }>(
      `SELECT * FROM webhook_deliveries WHERE ${where}
        ORDER BY created_at DESC, id
        LIMIT $${String(params.length + 1)} OFFSET $${String(params.length + 2)}`,
      [...params, f.limit, (f.page - 1) * f.limit],
    ),
    db.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM webhook_deliveries WHERE ${where}`,
      params,
    ),
  ]);
  return {
    items: rows.rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      eventType: r.event_type,
      status: r.status,
      attempts: r.attempts,
      lastStatus: r.last_status,
      lastError: r.last_error,
      nextAttemptAt: r.next_attempt_at.toISOString(),
      deliveredAt: r.delivered_at?.toISOString() ?? null,
      createdAt: r.created_at.toISOString(),
      payload: r.payload,
    })),
    total: count.rows[0]?.total ?? 0,
  };
}

/** redeliver puts a delivery back in the queue to send now, keeping its event id. */
export async function redeliver(
  db: Queryable,
  endpointId: string,
  deliveryId: string,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE webhook_deliveries SET status = 'pending', next_attempt_at = now(), attempts = 0
      WHERE id = $1 AND endpoint_id = $2`,
    [deliveryId, endpointId],
  );
  return rowCount === 1;
}

/** purgeDeliveries drops finished deliveries after 30 days. */
export async function purgeDeliveries(db: Queryable): Promise<number> {
  const { rowCount } = await db.query(
    "DELETE FROM webhook_deliveries WHERE status <> 'pending' AND created_at < now() - interval '30 days'",
  );
  return rowCount ?? 0;
}
