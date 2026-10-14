import type { Finding } from "@scc/shared";

import type { Queryable } from "../db/pool.ts";
import type { FindingDraft } from "../scoring/types.ts";

// Scores, findings and the QA review trail.

export interface ScoreInsert {
  callId: string;
  rubricId: string;
  modelCallId: string | null;
  overallScore: number | null;
  judgeStatus: "ok" | "failed";
  judgeError: string | null;
  talkRatio: number;
  coachingNotes: string[];
  needsReview: boolean;
}

/**
 * replaceScore writes the call's score and findings, replacing an earlier one
 * whose review is not done. Returns null when a completed review protects it.
 * Run inside the transaction that also sets the call to scored.
 */
export async function replaceScore(
  db: Queryable,
  score: ScoreInsert,
  findings: FindingDraft[],
): Promise<string | null> {
  const done = await db.query(
    "SELECT 1 FROM scores WHERE call_id = $1 AND review_status = 'done'",
    [score.callId],
  );
  if (done.rowCount) return null;
  await db.query("DELETE FROM scores WHERE call_id = $1", [score.callId]);
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO scores (call_id, rubric_id, model_call_id, overall_score, judge_status, judge_error, talk_ratio,
                         coaching_notes, needs_review, review_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10) RETURNING id`,
    [
      score.callId,
      score.rubricId,
      score.modelCallId,
      score.overallScore,
      score.judgeStatus,
      score.judgeError,
      score.talkRatio,
      JSON.stringify(score.coachingNotes),
      score.needsReview,
      score.needsReview ? "pending" : "not_required",
    ],
  );
  const scoreId = rows[0]?.id;
  if (!scoreId) throw new Error("insert into scores returned no row");
  for (const f of findings) {
    await db.query(
      `INSERT INTO findings (score_id, call_id, item_key, item_type, status, source, quote, segment_seq,
                             start_ms, end_ms, channel, rationale, grounded)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        scoreId,
        score.callId,
        f.itemKey,
        f.itemType,
        f.status,
        f.source,
        f.quote,
        f.segmentSeq,
        f.startMs,
        f.endMs,
        f.channel,
        f.rationale,
        f.grounded,
      ],
    );
  }
  return scoreId;
}

export interface ScoreRow {
  id: string;
  rubric_version: number;
  talk_ratio: number;
  coaching_notes: string[];
  judge_error: string | null;
  review_status: "not_required" | "pending" | "done";
  reviewed_by_name: string | null;
  reviewed_at: Date | null;
}

export async function getScore(db: Queryable, callId: string): Promise<ScoreRow | null> {
  const { rows } = await db.query<ScoreRow>(
    `SELECT s.id, r.version AS rubric_version, s.talk_ratio, s.coaching_notes, s.judge_error, s.review_status,
            p.display_name AS reviewed_by_name, s.reviewed_at
       FROM scores s JOIN rubrics r ON r.id = s.rubric_id LEFT JOIN profiles p ON p.id = s.reviewed_by
      WHERE s.call_id = $1`,
    [callId],
  );
  return rows[0] ?? null;
}

interface FindingRow {
  id: string;
  item_key: string;
  item_type: Finding["itemType"];
  status: Finding["status"];
  source: Finding["source"];
  quote: string | null;
  segment_seq: number | null;
  start_ms: number | null;
  end_ms: number | null;
  channel: Finding["channel"];
  rationale: string | null;
  grounded: boolean;
  decision: "agree" | "disagree" | null;
  note: string | null;
  reviewer_name: string | null;
  review_updated_at: Date | null;
}

export async function listFindings(db: Queryable, callId: string): Promise<Finding[]> {
  const { rows } = await db.query<FindingRow>(
    `SELECT f.id, f.item_key, f.item_type, f.status, f.source, f.quote, f.segment_seq, f.start_ms, f.end_ms,
            f.channel, f.rationale, f.grounded, r.decision, r.note, p.display_name AS reviewer_name,
            r.updated_at AS review_updated_at
       FROM findings f
       LEFT JOIN finding_reviews r ON r.finding_id = f.id
       LEFT JOIN profiles p ON p.id = r.reviewer_id
      WHERE f.call_id = $1
      ORDER BY CASE f.item_type WHEN 'prohibited' THEN 0 WHEN 'mandatory' THEN 1 ELSE 2 END, f.item_key, f.source`,
    [callId],
  );
  return rows.map((r) => ({
    id: r.id,
    itemKey: r.item_key,
    itemType: r.item_type,
    status: r.status,
    source: r.source,
    quote: r.quote,
    segmentSeq: r.segment_seq,
    startMs: r.start_ms,
    endMs: r.end_ms,
    channel: r.channel,
    rationale: r.rationale,
    grounded: r.grounded,
    review:
      r.decision && r.reviewer_name && r.review_updated_at
        ? {
            decision: r.decision,
            note: r.note,
            reviewerName: r.reviewer_name,
            updatedAt: r.review_updated_at.toISOString(),
          }
        : null,
  }));
}

export async function findingCall(
  db: Queryable,
  findingId: string,
): Promise<{ call_id: string; review_status: string } | null> {
  const { rows } = await db.query<{ call_id: string; review_status: string }>(
    "SELECT f.call_id, s.review_status FROM findings f JOIN scores s ON s.id = f.score_id WHERE f.id = $1",
    [findingId],
  );
  return rows[0] ?? null;
}

export async function upsertReview(
  db: Queryable,
  findingId: string,
  reviewerId: string,
  decision: "agree" | "disagree",
  note: string | null,
): Promise<void> {
  await db.query(
    `INSERT INTO finding_reviews (finding_id, reviewer_id, decision, note) VALUES ($1, $2, $3, $4)
     ON CONFLICT (finding_id) DO UPDATE SET reviewer_id = $2, decision = $3, note = $4, updated_at = now()`,
    [findingId, reviewerId, decision, note],
  );
}

/** addReviewerFinding records a judge miss a reviewer found (Q-008); the reviewer agrees with it by adding it. */
export async function addReviewerFinding(
  db: Queryable,
  input: {
    callId: string;
    itemKey: string;
    itemType: string;
    status: string;
    segment: { seq: number; startMs: number; endMs: number; channel: string; text: string } | null;
    note: string | null;
    reviewerId: string;
  },
): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO findings (score_id, call_id, item_key, item_type, status, source, quote, segment_seq, start_ms,
                           end_ms, channel, rationale, grounded, created_by)
     SELECT s.id, $1, $2, $3, $4, 'reviewer', $5, $6, $7, $8, $9, $10, true, $11
       FROM scores s WHERE s.call_id = $1 AND s.review_status <> 'done'
     RETURNING id`,
    [
      input.callId,
      input.itemKey,
      input.itemType,
      input.status,
      input.segment?.text ?? null,
      input.segment?.seq ?? null,
      input.segment?.startMs ?? null,
      input.segment?.endMs ?? null,
      input.segment?.channel ?? null,
      input.note,
      input.reviewerId,
    ],
  );
  const id = rows[0]?.id;
  if (id) await upsertReview(db, id, input.reviewerId, "agree", input.note);
  return id ?? null;
}

/** completeReview closes the review only when every finding has a decision; returns what blocked it. */
export async function completeReview(
  db: Queryable,
  callId: string,
  reviewerId: string,
): Promise<"done" | "undecided" | "not_pending"> {
  const pending = await db.query<{ undecided: number }>(
    `SELECT count(*) FILTER (WHERE r.id IS NULL) AS undecided
       FROM findings f LEFT JOIN finding_reviews r ON r.finding_id = f.id
      WHERE f.call_id = $1`,
    [callId],
  );
  if ((pending.rows[0]?.undecided ?? 0) > 0) return "undecided";
  const { rowCount } = await db.query(
    `UPDATE scores SET review_status = 'done', reviewed_by = $2, reviewed_at = now(), updated_at = now()
      WHERE call_id = $1 AND review_status = 'pending'`,
    [callId, reviewerId],
  );
  return rowCount ? "done" : "not_pending";
}
