import { inTransaction, type Pool, type Queryable } from "../db/pool.ts";
import * as calls from "../repo/calls.ts";
import { notify } from "../repo/inbox.ts";
import { emitEvent } from "../repo/webhooks.ts";

// The pipeline's webhook events (ADR-0021), written in the same transaction
// as the change they announce. Payloads carry ids, scores and counts, never
// transcript text, so no personal data leaves through a webhook.

/** announceScored queues call.scored, and batch.completed if this was the batch's last call. */
export async function announceScored(db: Queryable, callId: string): Promise<void> {
  const { rows } = await db.query<{
    batch_id: string;
    agent_id: string;
    team_id: string;
    product_id: string;
    overall_score: number | null;
    needs_review: boolean;
    judge_status: string;
    breaches: number;
  }>(
    `SELECT c.batch_id, c.agent_id, c.team_id, c.product_id, s.overall_score, s.needs_review, s.judge_status,
            (SELECT count(*)::int FROM findings x WHERE x.call_id = c.id AND x.status = 'breach') AS breaches
       FROM calls c JOIN scores s ON s.call_id = c.id WHERE c.id = $1`,
    [callId],
  );
  const r = rows[0];
  if (!r) return;
  await emitEvent(db, "call.scored", {
    callId,
    batchId: r.batch_id,
    agentId: r.agent_id,
    teamId: r.team_id,
    productId: r.product_id,
    overallScore: r.overall_score,
    needsReview: r.needs_review,
    judgeStatus: r.judge_status,
    breaches: r.breaches,
  });
  await completeBatchIfDone(db, callId);
}

/**
 * completeBatchIfDone marks the call's batch complete when no call in it is
 * still queued or running, and queues batch.completed. The update succeeds
 * once per run of the batch, so the event is sent once.
 */
export async function completeBatchIfDone(db: Queryable, callId: string): Promise<void> {
  const { rows } = await db.query<{
    id: string;
    name: string;
    created_by: string;
    total: number;
    scored: number;
    failed: number;
  }>(
    `UPDATE batches b SET completed_at = now()
      WHERE b.id = (SELECT batch_id FROM calls WHERE id = $1)
        AND b.completed_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM calls c WHERE c.batch_id = b.id AND c.deleted_at IS NULL
                          AND c.status NOT IN ('scored', 'failed'))
     RETURNING b.id, b.name, b.created_by,
       (SELECT count(*)::int FROM calls c WHERE c.batch_id = b.id AND c.deleted_at IS NULL) AS total,
       (SELECT count(*)::int FROM calls c WHERE c.batch_id = b.id AND c.deleted_at IS NULL AND c.status = 'scored') AS scored,
       (SELECT count(*)::int FROM calls c WHERE c.batch_id = b.id AND c.deleted_at IS NULL AND c.status = 'failed') AS failed`,
    [callId],
  );
  const b = rows[0];
  if (b) {
    await emitEvent(db, "batch.completed", {
      batchId: b.id,
      name: b.name,
      total: b.total,
      scored: b.scored,
      failed: b.failed,
    });
    // The person who started it (for an API batch, the key's manager) hears it is done.
    await notify(db, [b.created_by], {
      kind: "batch",
      title: `Batch "${b.name}" finished`,
      body:
        b.failed > 0
          ? `${String(b.scored)} of ${String(b.total)} calls scored; ${String(b.failed)} failed and can be retried.`
          : b.total === 1
            ? "Its call was scored."
            : `All ${String(b.total)} calls scored.`,
      link: `/batches/${b.id}`,
      data: { batchId: b.id, total: b.total, scored: b.scored, failed: b.failed },
    });
  }
}

/** failCall marks a call failed and announces it, in one transaction. */
export async function failCall(pool: Pool, callId: string, reason: string): Promise<void> {
  await inTransaction(pool, async (client) => {
    await calls.markFailed(client, callId, reason);
    await emitEvent(client, "call.failed", { callId, reason });
    await completeBatchIfDone(client, callId);
  });
}
