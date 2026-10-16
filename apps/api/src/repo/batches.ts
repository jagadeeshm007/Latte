import type { Batch, BatchDetail, BatchState, RubricItem } from "@scc/shared";

import { NOT_PASSED, NOT_REJECTED } from "./analytics.ts";
import { likePattern } from "./sql.ts";
import type { Queryable } from "../db/pool.ts";

// Batches: calls uploaded together, by a person in the app or by an API key
// (ADR-0017). Counts come from the live calls in the batch; deleted calls
// leave every count, as everywhere else (ADR-0015).

const SUMMARY = `
  SELECT b.id, b.name, b.source, b.created_by, p.display_name AS created_by_name,
         b.created_at, b.archived_at,
         count(c.id)::int AS total,
         (count(c.id) FILTER (WHERE c.status = 'uploaded'))::int AS queued,
         (count(c.id) FILTER (WHERE c.status IN ('transcribing', 'transcribed', 'scoring')))::int AS processing,
         (count(c.id) FILTER (WHERE c.status = 'scored'))::int AS scored,
         (count(c.id) FILTER (WHERE c.status = 'failed'))::int AS failed,
         (count(s.id) FILTER (WHERE s.needs_review))::int AS flagged,
         avg(s.overall_score) AS avg_score,
         coalesce(sum(c.duration_ms), 0)::bigint AS audio_ms,
         max(c.updated_at) AS last_activity_at
    FROM batches b
    JOIN profiles p ON p.id = b.created_by
    LEFT JOIN calls c ON c.batch_id = b.id AND c.deleted_at IS NULL
    LEFT JOIN scores s ON s.call_id = c.id`;

/** The state each batch is in, from its counts; used to filter in SQL too. */
const STATE_SQL: Record<BatchState, string> = {
  processing: "queued + processing > 0",
  completed: "queued + processing = 0 AND failed = 0",
  has_failures: "queued + processing = 0 AND failed > 0",
};

interface SummaryRow {
  id: string;
  name: string;
  source: "web" | "api";
  created_by: string;
  created_by_name: string;
  created_at: Date;
  archived_at: Date | null;
  total: number;
  queued: number;
  processing: number;
  scored: number;
  failed: number;
  flagged: number;
  avg_score: number | null;
  audio_ms: number;
  last_activity_at: Date | null;
}

function stateOf(r: SummaryRow): BatchState {
  if (r.queued + r.processing > 0) return "processing";
  return r.failed > 0 ? "has_failures" : "completed";
}

function toBatch(r: SummaryRow): Batch {
  return {
    id: r.id,
    name: r.name,
    source: r.source,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: r.created_at.toISOString(),
    archivedAt: r.archived_at?.toISOString() ?? null,
    total: r.total,
    queued: r.queued,
    processing: r.processing,
    scored: r.scored,
    failed: r.failed,
    flagged: r.flagged,
    avgScore: r.avg_score === null ? null : Math.round(r.avg_score * 10) / 10,
    state: stateOf(r),
  };
}

export async function insertBatch(
  db: Queryable,
  b: { name: string; createdBy: string; source: "web" | "api"; apiKeyId?: string | null },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO batches (name, created_by, source, api_key_id) VALUES ($1, $2, $3, $4) RETURNING id",
    [b.name, b.createdBy, b.source, b.apiKeyId ?? null],
  );
  const row = rows[0];
  if (!row) throw new Error("insert into batches returned no row");
  return row.id;
}

/**
 * lockBatchForUpload locks a batch row for the rest of the transaction and
 * returns what a confirm must check: its owner, whether it is archived, and
 * how many calls it holds. The lock makes "count, then add" safe when two
 * chunks of one batch are confirmed at once.
 */
export async function lockBatchForUpload(
  db: Queryable,
  id: string,
): Promise<{ createdBy: string; archived: boolean; calls: number } | null> {
  const { rows } = await db.query<{ created_by: string; archived: boolean }>(
    "SELECT created_by, archived_at IS NOT NULL AS archived FROM batches WHERE id = $1 FOR UPDATE",
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const count = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM calls WHERE batch_id = $1 AND deleted_at IS NULL",
    [id],
  );
  return { createdBy: row.created_by, archived: row.archived, calls: count.rows[0]?.n ?? 0 };
}

export async function listBatches(
  db: Queryable,
  f: {
    q?: string | undefined;
    state?: BatchState | undefined;
    archived: boolean;
    page: number;
    limit: number;
  },
): Promise<{ items: Batch[]; total: number }> {
  const where: string[] = [f.archived ? "b.archived_at IS NOT NULL" : "b.archived_at IS NULL"];
  const params: unknown[] = [];
  if (f.q) {
    params.push(likePattern(f.q));
    where.push(`b.name ILIKE $${String(params.length)}`);
  }
  const grouped = `${SUMMARY} WHERE ${where.join(" AND ")} GROUP BY b.id, p.display_name`;
  const having = f.state ? `WHERE ${STATE_SQL[f.state]}` : "";
  const pageParams = [...params, f.limit, (f.page - 1) * f.limit];
  const [rows, count] = await Promise.all([
    db.query<SummaryRow>(
      `SELECT * FROM (${grouped}) x ${having}
        ORDER BY created_at DESC, id DESC
        LIMIT $${String(pageParams.length - 1)} OFFSET $${String(pageParams.length)}`,
      pageParams,
    ),
    db.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM (${grouped}) x ${having}`,
      params,
    ),
  ]);
  return { items: rows.rows.map(toBatch), total: count.rows[0]?.total ?? 0 };
}

export async function getBatch(db: Queryable, id: string): Promise<BatchDetail | null> {
  const { rows } = await db.query<SummaryRow>(
    `${SUMMARY} WHERE b.id = $1 GROUP BY b.id, p.display_name`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const extra = await db.query<{ breaches: number; cost_usd: number }>(
    `SELECT (SELECT count(*)::int FROM findings x JOIN calls c ON c.id = x.call_id
              WHERE c.batch_id = $1 AND c.deleted_at IS NULL AND x.status = 'breach'
                AND ${NOT_REJECTED}) AS breaches,
            (SELECT coalesce(sum(m.cost_usd), 0) FROM model_calls m JOIN calls c ON c.id = m.call_id
              WHERE c.batch_id = $1) AS cost_usd`,
    [id],
  );
  const e = extra.rows[0] ?? { breaches: 0, cost_usd: 0 };
  return {
    ...toBatch(row),
    breaches: e.breaches,
    audioMs: row.audio_ms,
    costUsd: Math.round(e.cost_usd * 10_000) / 10_000,
    lastActivityAt: row.last_activity_at?.toISOString() ?? null,
  };
}

export async function updateBatch(
  db: Queryable,
  id: string,
  patch: { name?: string | undefined; archived?: boolean | undefined },
): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE batches
        SET name = coalesce($2, name),
            archived_at = CASE WHEN $3::boolean IS NULL THEN archived_at
                               WHEN $3 THEN coalesce(archived_at, now()) ELSE NULL END
      WHERE id = $1`,
    [id, patch.name ?? null, patch.archived ?? null],
  );
  return rowCount === 1;
}

/** Calls in the batch a retry can pick up: failed, judge failed, or stuck (requeueForRetry decides). */
export async function retryableCallIds(db: Queryable, batchId: string): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT c.id FROM calls c
       LEFT JOIN scores s ON s.call_id = c.id
      WHERE c.batch_id = $1 AND c.deleted_at IS NULL
        AND (c.status = 'failed' OR (c.status = 'scored' AND s.judge_status = 'failed'))
      ORDER BY c.created_at, c.id`,
    [batchId],
  );
  return rows.map((r) => r.id);
}

export interface ExportRow {
  id: string;
  original_filename: string;
  call_date: string;
  agent_name: string;
  team_name: string;
  product_name: string;
  language: string;
  status: string;
  duration_ms: number | null;
  overall_score: number | null;
  needs_review: boolean | null;
  review_status: string | null;
  storage_path: string | null;
  error: string | null;
  /** item key to its outcome on this call: pass, fail or n/a. */
  items: Record<string, "pass" | "fail" | "n/a">;
  breaches: number;
}

/** exportRows: one row per live call in the batch, with each rubric item's outcome. */
export async function exportRows(db: Queryable, batchId: string): Promise<ExportRow[]> {
  const calls = await db.query<Omit<ExportRow, "items" | "breaches">>(
    `SELECT c.id, c.original_filename, c.call_date, a.name AS agent_name, t.name AS team_name,
            p.name AS product_name, c.language, c.status, c.duration_ms, s.overall_score,
            s.needs_review, s.review_status, c.storage_path, c.error
       FROM calls c
       JOIN agents a ON a.id = c.agent_id
       JOIN teams t ON t.id = c.team_id
       JOIN products p ON p.id = c.product_id
       LEFT JOIN scores s ON s.call_id = c.id
      WHERE c.batch_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at, c.id`,
    [batchId],
  );
  const items = await db.query<{
    call_id: string;
    item_key: string;
    bad: boolean;
    na: boolean;
    breach: boolean;
  }>(
    `SELECT x.call_id, x.item_key,
            bool_or(x.status IN ${NOT_PASSED}) AS bad,
            bool_and(x.status = 'not_applicable') AS na,
            bool_or(x.status = 'breach') AS breach
       FROM findings x JOIN calls c ON c.id = x.call_id
      WHERE c.batch_id = $1 AND c.deleted_at IS NULL AND ${NOT_REJECTED}
      GROUP BY 1, 2`,
    [batchId],
  );
  const byCall = new Map<string, { items: ExportRow["items"]; breaches: number }>();
  for (const r of items.rows) {
    const entry = byCall.get(r.call_id) ?? { items: {}, breaches: 0 };
    entry.items[r.item_key] = r.na ? "n/a" : r.bad ? "fail" : "pass";
    if (r.breach) entry.breaches += 1;
    byCall.set(r.call_id, entry);
  }
  return calls.rows.map((c) => ({ ...c, ...(byCall.get(c.id) ?? { items: {}, breaches: 0 }) }));
}

/** The CSV header and row cells for a batch's results, rubric items in rubric order. */
export function resultsTable(
  rows: ExportRow[],
  rubric: RubricItem[],
): (string | number | null)[][] {
  return [
    [
      "call_id",
      "file",
      "call_date",
      "agent",
      "team",
      "product",
      "language",
      "status",
      "duration_seconds",
      "score",
      "flagged",
      "review",
      "breaches",
      ...rubric.map((i) => i.key),
      "error",
    ],
    ...rows.map((r) => [
      r.id,
      r.original_filename,
      r.call_date,
      r.agent_name,
      r.team_name,
      r.product_name,
      r.language,
      r.status,
      r.duration_ms === null ? null : Math.round(r.duration_ms / 1000),
      r.overall_score,
      r.needs_review === null ? null : r.needs_review ? "yes" : "no",
      r.review_status,
      r.breaches,
      ...rubric.map((i) => r.items[i.key] ?? null),
      r.error,
    ]),
  ];
}
