import type { CallGroup, CallInput, CallStatus, CallSummary, Flag, Language } from "@scc/shared";

import { likePattern } from "./sql.ts";
import type { Queryable } from "../db/pool.ts";

// Calls and their transcripts. Every read an agent can reach carries the
// agent predicate in SQL (tenet 4); a call outside it is simply not found.

export interface Scope {
  /** Set for sales agents: only calls of this agent are visible. */
  agentId: string | null;
}

export interface CallRow {
  id: string;
  agent_id: string;
  status: CallStatus;
  storage_path: string | null;
  mime_type: string;
  duration_ms: number | null;
  audio_purged_at: Date | null;
  language: Language;
  product_id: string;
  input: CallInput;
}

/** The flag a call shows: needs a look, scored clean, or still in the pipeline. */
const FLAG_SQL = `CASE WHEN c.status <> 'scored' THEN 'pending'
       WHEN COALESCE(f.breaches, 0) > 0 OR COALESCE(f.missed, 0) > 0 OR COALESCE(s.needs_review, false)
       THEN 'flagged' ELSE 'passed' END`;

const SUMMARY_SELECT = `
  SELECT c.id, c.agent_id, a.name AS agent_name, t.name AS team_name, p.name AS product_name,
         c.call_date, c.original_filename, c.language, c.status, c.error, c.duration_ms, c.created_at,
         c.created_at::text AS created_at_text,
         s.overall_score, s.judge_status, s.needs_review, s.review_status,
         COALESCE(f.breaches, 0) AS breaches, COALESCE(f.missed, 0) AS missed,
         ${FLAG_SQL} AS flag, c.archived_at, c.batch_id, b.name AS batch_name, c.input, c.timed
    FROM calls c
    JOIN batches b ON b.id = c.batch_id
    JOIN agents a ON a.id = c.agent_id
    JOIN teams t ON t.id = c.team_id
    JOIN products p ON p.id = c.product_id
    LEFT JOIN scores s ON s.call_id = c.id
    LEFT JOIN LATERAL (
      SELECT count(DISTINCT x.item_key) FILTER (WHERE x.status = 'breach') AS breaches,
             count(DISTINCT x.item_key) FILTER (WHERE x.status = 'missed' AND x.item_type = 'mandatory') AS missed
        FROM findings x
       WHERE x.call_id = c.id
         AND NOT EXISTS (SELECT 1 FROM finding_reviews r WHERE r.finding_id = x.id AND r.decision = 'disagree')
    ) f ON true`;

interface SummaryRow {
  id: string;
  agent_id: string;
  agent_name: string;
  team_name: string;
  product_name: string;
  call_date: string;
  original_filename: string;
  language: Language;
  status: CallStatus;
  error: string | null;
  duration_ms: number | null;
  created_at: Date;
  created_at_text: string;
  overall_score: number | null;
  judge_status: string | null;
  needs_review: boolean | null;
  review_status: "not_required" | "pending" | "done" | null;
  breaches: number;
  missed: number;
  flag: Flag;
  archived_at: Date | null;
  batch_id: string;
  batch_name: string;
  input: CallInput;
  timed: boolean;
}

export function toSummary(r: SummaryRow): CallSummary {
  return {
    id: r.id,
    agentId: r.agent_id,
    agentName: r.agent_name,
    teamName: r.team_name,
    productName: r.product_name,
    callDate: r.call_date,
    originalFilename: r.original_filename,
    language: r.language,
    status: r.status,
    error: r.error,
    durationMs: r.duration_ms,
    createdAt: r.created_at.toISOString(),
    overallScore: r.overall_score,
    judgeStatus: r.judge_status,
    needsReview: r.needs_review,
    reviewStatus: r.review_status,
    breaches: r.breaches,
    missed: r.missed,
    flag: r.flag,
    archivedAt: r.archived_at?.toISOString() ?? null,
    batchId: r.batch_id,
    batchName: r.batch_name,
    input: r.input,
    timed: r.timed,
  };
}

export interface ListFilter {
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
  limit: number;
  page?: number | undefined;
  cursor?: string | undefined;
}

const GROUP_ORDER: Record<CallGroup, string> = {
  agent: "a.name",
  team: "t.name",
  product: "p.name",
  language: "c.language",
  status: "c.status",
  flag: FLAG_SQL,
};

export function encodeCursor(createdAtText: string, id: string): string {
  return Buffer.from(`${createdAtText}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string): [string, string] | null {
  const [ts, id] = Buffer.from(cursor, "base64url").toString().split("|");
  return ts && id && /^[0-9a-f-]{36}$/.test(id) ? [ts, id] : null;
}

export async function listCalls(
  db: Queryable,
  scope: Scope,
  filter: ListFilter,
): Promise<{ items: CallSummary[]; nextCursor: string | null; total: number }> {
  // Deleted calls are never listed; archived ones only when asked for (ADR-0015).
  const where: string[] = ["c.deleted_at IS NULL"];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replaceAll("?", `$${String(params.length)}`));
  };
  if (scope.agentId) add("c.agent_id = ?", scope.agentId);
  if (filter.agentId) add("c.agent_id = ?", filter.agentId);
  if (filter.teamId) add("c.team_id = ?", filter.teamId);
  if (filter.productId) add("c.product_id = ?", filter.productId);
  if (filter.language) add("c.language = ?", filter.language);
  if (filter.batchId) add("c.batch_id = ?", filter.batchId);
  if (filter.status) add("c.status = ?", filter.status);
  if (filter.flag) add(`(${FLAG_SQL}) = ?`, filter.flag);
  if (filter.needsReview !== undefined)
    add("COALESCE(s.needs_review, false) = ?", filter.needsReview);
  if (filter.q) {
    add(
      "(c.original_filename ILIKE ? OR a.name ILIKE ? OR t.name ILIKE ? OR p.name ILIKE ?)",
      likePattern(filter.q),
    );
  }
  where.push(filter.archived ? "c.archived_at IS NOT NULL" : "c.archived_at IS NULL");
  const filtered = `WHERE ${where.join(" AND ")}`;
  const countParams = [...params];
  const cursor = filter.cursor && !filter.page ? decodeCursor(filter.cursor) : null;
  if (cursor) {
    params.push(cursor[0], cursor[1]);
    where.push(
      `(c.created_at, c.id) < ($${String(params.length - 1)}::timestamptz, $${String(params.length)}::uuid)`,
    );
  }
  const order = [
    ...(filter.groupBy ? [`${GROUP_ORDER[filter.groupBy]} ASC`] : []),
    "c.created_at DESC",
    "c.id DESC",
  ].join(", ");
  params.push(filter.limit + 1);
  const limit = `LIMIT $${String(params.length)}`;
  let offset = "";
  if (filter.page) {
    params.push((filter.page - 1) * filter.limit);
    offset = ` OFFSET $${String(params.length)}`;
  }
  const [{ rows }, count] = await Promise.all([
    db.query<SummaryRow>(
      `${SUMMARY_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order} ${limit}${offset}`,
      params,
    ),
    db.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM (${SUMMARY_SELECT} ${filtered}) x`,
      countParams,
    ),
  ]);
  const page = rows.slice(0, filter.limit);
  const last = page[page.length - 1];
  return {
    items: page.map(toSummary),
    nextCursor:
      !filter.page && rows.length > filter.limit && last
        ? encodeCursor(last.created_at_text, last.id)
        : null,
    total: count.rows[0]?.total ?? 0,
  };
}

export async function getCallSummary(
  db: Queryable,
  scope: Scope,
  id: string,
): Promise<CallSummary | null> {
  const params: unknown[] = [id];
  let extra = "";
  if (scope.agentId) {
    params.push(scope.agentId);
    extra = " AND c.agent_id = $2";
  }
  const { rows } = await db.query<SummaryRow>(
    `${SUMMARY_SELECT} WHERE c.id = $1 AND c.deleted_at IS NULL${extra}`,
    params,
  );
  return rows[0] ? toSummary(rows[0]) : null;
}

export async function getCallRow(db: Queryable, scope: Scope, id: string): Promise<CallRow | null> {
  const params: unknown[] = [id];
  let extra = "";
  if (scope.agentId) {
    params.push(scope.agentId);
    extra = " AND agent_id = $2";
  }
  const { rows } = await db.query<CallRow>(
    `SELECT id, agent_id, status, storage_path, mime_type, duration_ms, audio_purged_at, language, product_id, input FROM calls WHERE id = $1 AND deleted_at IS NULL${extra}`,
    params,
  );
  return rows[0] ?? null;
}

export interface NewCall {
  agentId: string;
  teamId: string;
  productId: string;
  callDate: string;
  batchId: string;
  uploadedBy: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  /** Null for a transcript upload, which has no audio. */
  storagePath: string | null;
  retentionDays: number;
  language: Language;
  /** Defaults to audio with real times. */
  input?: CallInput;
  timed?: boolean;
}

export async function insertCall(db: Queryable, c: NewCall): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO calls (agent_id, team_id, product_id, call_date, batch_id, uploaded_by, original_filename,
                        mime_type, size_bytes, storage_path, retention_until, language, input, timed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             current_date + coalesce((SELECT audio_retention_days FROM teams WHERE id = $2), $11::int), $12, $13, $14)
     RETURNING id`,
    [
      c.agentId,
      c.teamId,
      c.productId,
      c.callDate,
      c.batchId,
      c.uploadedBy,
      c.originalFilename,
      c.mimeType,
      c.sizeBytes,
      c.storagePath,
      c.retentionDays,
      c.language,
      c.input ?? "audio",
      c.timed ?? true,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("insert into calls returned no row");
  return row.id;
}

/**
 * claimCall moves a call from `from` to `to` in one statement and returns it,
 * or null when another worker or a later state got there first. A call left in
 * `to` for longer than staleSeconds belongs to a crashed or expired job and may
 * be claimed again (review finding 11: no check-then-act, no double run).
 */
export async function claimCall(
  db: Queryable,
  id: string,
  from: CallStatus,
  to: CallStatus,
  staleSeconds: number,
): Promise<CallRow | null> {
  const { rows } = await db.query<CallRow>(
    `UPDATE calls SET status = $3, error = NULL, updated_at = now()
      WHERE id = $1
        AND (status = $2 OR (status = $3 AND updated_at < now() - make_interval(secs => $4)))
      RETURNING id, agent_id, status, storage_path, mime_type, duration_ms, audio_purged_at, language, product_id, input`,
    [id, from, to, staleSeconds],
  );
  return rows[0] ?? null;
}

/** failStuckCalls marks calls that sat in the pipeline far past any job expiry as failed, so Retry can pick them up. */
export async function failStuckCalls(db: Queryable, olderThanSeconds: number): Promise<number> {
  const { rowCount } = await db.query(
    `UPDATE calls SET status = 'failed', error = 'Processing stopped before it finished; retry the call', updated_at = now()
      WHERE status IN ('uploaded', 'transcribing', 'transcribed', 'scoring')
        AND updated_at < now() - make_interval(secs => $1)`,
    [olderThanSeconds],
  );
  return rowCount ?? 0;
}

/**
 * listWaitingCalls finds live calls waiting for their next job longer than
 * olderThanSeconds, oldest first; `since` is when each last moved, in
 * milliseconds, as text so it keys a publish exactly.
 */
export async function listWaitingCalls(
  db: Queryable,
  olderThanSeconds: number,
  limit: number,
): Promise<{ id: string; status: "uploaded" | "transcribed"; since: string }[]> {
  const { rows } = await db.query<{
    id: string;
    status: "uploaded" | "transcribed";
    since: string;
  }>(
    `SELECT id, status, floor(extract(epoch FROM updated_at) * 1000)::bigint::text AS since
       FROM calls
      WHERE deleted_at IS NULL AND status IN ('uploaded', 'transcribed')
        AND updated_at < now() - make_interval(secs => $1)
      ORDER BY updated_at
      LIMIT $2`,
    [olderThanSeconds, limit],
  );
  return rows;
}

/**
 * requeueForRetry atomically moves a failed call, an unscored call whose review
 * is not done, or a call stuck in flight, back to the step it needs, and says
 * which step. Two reviewers pressing Retry together queue it once. A
 * transcript upload has its lines from the start, so it always goes back to
 * the prepare step, where a failed translation is done again (ADR-0030).
 */
export async function requeueForRetry(
  db: Queryable,
  id: string,
  staleSeconds: number,
): Promise<"transcribe" | "score" | null> {
  const { rows } = await db.query<{ status: CallStatus }>(
    `UPDATE calls c
        SET status = CASE WHEN c.input = 'audio'
                               AND EXISTS (SELECT 1 FROM transcript_segments t WHERE t.call_id = c.id)
                          THEN 'transcribed'::call_status ELSE 'uploaded'::call_status END,
            error = NULL, updated_at = now()
      WHERE c.id = $1
        AND (c.status = 'failed'
             OR (c.status = 'scored' AND EXISTS (SELECT 1 FROM scores s WHERE s.call_id = c.id AND s.judge_status = 'failed' AND s.review_status <> 'done'))
             OR (c.status IN ('uploaded', 'transcribing', 'transcribed', 'scoring') AND c.updated_at < now() - make_interval(secs => $2)))
      RETURNING c.status`,
    [id, staleSeconds],
  );
  const status = rows[0]?.status;
  return status === undefined ? null : status === "transcribed" ? "score" : "transcribe";
}

export async function setStatus(db: Queryable, id: string, status: CallStatus): Promise<void> {
  await db.query("UPDATE calls SET status = $2, error = NULL, updated_at = now() WHERE id = $1", [
    id,
    status,
  ]);
}

export async function markFailed(db: Queryable, id: string, error: string): Promise<void> {
  await db.query(
    "UPDATE calls SET status = 'failed', error = $2, updated_at = now() WHERE id = $1",
    [id, error.slice(0, 500)],
  );
}

export async function setDuration(db: Queryable, id: string, durationMs: number): Promise<void> {
  await db.query("UPDATE calls SET duration_ms = $2, updated_at = now() WHERE id = $1", [
    id,
    durationMs,
  ]);
}

export interface SegmentRow {
  seq: number;
  channel: "agent" | "customer";
  start_ms: number;
  end_ms: number;
  text: string;
  language: string | null;
  avg_logprob: number | null;
  /** jsonb, written only by replaceSegments in this shape. */
  words: { text: string; startMs: number; endMs: number }[];
  text_en: string | null;
}

export async function replaceSegments(
  db: Queryable,
  callId: string,
  segments: {
    seq: number;
    channel: string;
    startMs: number;
    endMs: number;
    text: string;
    language: string | null;
    avgLogprob: number | null;
    words: { text: string; startMs: number; endMs: number }[];
  }[],
): Promise<void> {
  await db.query("DELETE FROM transcript_segments WHERE call_id = $1", [callId]);
  if (segments.length === 0) return;
  await db.query(
    `INSERT INTO transcript_segments (call_id, seq, channel, start_ms, end_ms, text, language, avg_logprob, words)
     SELECT $1, * FROM unnest($2::int[], $3::speaker_channel[], $4::int[], $5::int[], $6::text[], $7::text[], $8::real[], $9::jsonb[])`,
    [
      callId,
      segments.map((s) => s.seq),
      segments.map((s) => s.channel),
      segments.map((s) => s.startMs),
      segments.map((s) => s.endMs),
      segments.map((s) => s.text),
      segments.map((s) => s.language),
      segments.map((s) => s.avgLogprob),
      segments.map((s) => JSON.stringify(s.words)),
    ],
  );
}

/** setTranslations stores the English translation of each line of a regional call. */
export async function setTranslations(
  db: Queryable,
  callId: string,
  translations: { seq: number; textEn: string }[],
): Promise<void> {
  if (translations.length === 0) return;
  await db.query(
    `UPDATE transcript_segments t SET text_en = x.text_en
       FROM unnest($2::int[], $3::text[]) AS x(seq, text_en)
      WHERE t.call_id = $1 AND t.seq = x.seq`,
    [callId, translations.map((t) => t.seq), translations.map((t) => t.textEn)],
  );
}

/**
 * setArchived archives or unarchives a call the caller may see; false when
 * there is no such call (unknown, deleted or out of scope).
 */
export async function setArchived(
  db: Queryable,
  scope: Scope,
  id: string,
  archived: boolean,
): Promise<boolean> {
  const params: unknown[] = [id];
  let extra = "";
  if (scope.agentId) {
    params.push(scope.agentId);
    extra = " AND agent_id = $2";
  }
  const { rowCount } = await db.query(
    `UPDATE calls SET archived_at = ${archived ? "now()" : "NULL"}, updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL${extra}`,
    params,
  );
  return (rowCount ?? 0) > 0;
}

/** softDelete hides a call everywhere; the row stays for audit. False when there is no such call. */
export async function softDelete(db: Queryable, id: string): Promise<boolean> {
  const { rowCount } = await db.query(
    "UPDATE calls SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  return (rowCount ?? 0) > 0;
}

/** productNameOf names the call's product, which speech-to-text is told to expect as written. */
export async function productNameOf(db: Queryable, callId: string): Promise<string | null> {
  const { rows } = await db.query<{ name: string }>(
    "SELECT p.name FROM calls c JOIN products p ON p.id = c.product_id WHERE c.id = $1",
    [callId],
  );
  return rows[0]?.name ?? null;
}

export async function listSegments(db: Queryable, callId: string): Promise<SegmentRow[]> {
  const { rows } = await db.query<SegmentRow>(
    "SELECT seq, channel, start_ms, end_ms, text, language, avg_logprob, words, text_en FROM transcript_segments WHERE call_id = $1 ORDER BY seq",
    [callId],
  );
  return rows;
}

export async function callsDueForPurge(
  db: Queryable,
  limit = 100,
): Promise<{ id: string; storage_path: string }[]> {
  const { rows } = await db.query<{ id: string; storage_path: string }>(
    `SELECT id, storage_path FROM calls
      WHERE audio_purged_at IS NULL AND retention_until < current_date AND storage_path IS NOT NULL
      ORDER BY retention_until LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function markPurged(db: Queryable, id: string): Promise<void> {
  await db.query(
    "UPDATE calls SET audio_purged_at = now(), storage_path = NULL, updated_at = now() WHERE id = $1",
    [id],
  );
}

export async function knownStoragePaths(db: Queryable, paths: string[]): Promise<Set<string>> {
  if (paths.length === 0) return new Set();
  const { rows } = await db.query<{ storage_path: string }>(
    "SELECT storage_path FROM calls WHERE storage_path = ANY($1::text[])",
    [paths],
  );
  return new Set(rows.map((r) => r.storage_path));
}
