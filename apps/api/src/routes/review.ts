import {
  addFindingRequestSchema,
  dashboardQuerySchema,
  highlightsQuerySchema,
  leaderboardQuerySchema,
  reviewDecisionRequestSchema,
  rubricQuerySchema,
  saveRubricRequestSchema,
  statusFits,
  usageHistoryQuerySchema,
} from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { AppError, ConflictError, NotFoundError } from "../errors.ts";
import { agreement, dashboard, scorecard } from "../repo/analytics.ts";
import * as calls from "../repo/calls.ts";
import { highlights, leaderboard } from "../repo/performance.ts";
import {
  activeRubric,
  audit,
  listRubrics,
  rubricFor,
  saveRubricVersion,
  usageHistory,
  usageThisMonth,
} from "../repo/reference.ts";
import {
  addReviewerFinding,
  completeReview,
  findingCall,
  rescoreAfterReview,
  scoreRubricItems,
  upsertReview,
} from "../repo/scores.ts";

const idParam = z.object({ id: z.uuid() });

/** orderedRange refuses a date range that ends before it starts. */
function orderedRange(q: { from?: string | undefined; to?: string | undefined }) {
  if (q.from && q.to && q.from > q.to) {
    throw new AppError("from must be on or before to", 400, "invalid_range");
  }
}

async function rubricOrFail(deps: AppDeps) {
  const rubric = await activeRubric(deps.pool);
  if (!rubric) throw new AppError("no active rubric; run the seed", 503, "service_unavailable");
  return rubric;
}

/** QA review, agreement, scorecards, dashboard, rubric and usage (US-01-004 to US-01-008, US-00-001, US-00-002). */
export function reviewRouter(deps: AppDeps): Router {
  const { pool } = deps;
  const router = Router();
  const qa = requireRole("qa_reviewer");
  const qaOrManager = requireRole("qa_reviewer", "manager");
  const manager = requireRole("manager");

  router.get("/review/queue", qaOrManager, async (_req, res) => {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT s.call_id AS id FROM scores s JOIN calls c ON c.id = s.call_id
        WHERE s.review_status = 'pending' AND c.archived_at IS NULL AND c.deleted_at IS NULL
        ORDER BY s.created_at LIMIT 100`,
    );
    const items = await Promise.all(
      rows.map((r) => calls.getCallSummary(pool, { agentId: null }, r.id)),
    );
    res.json({ items: items.filter((i) => i !== null) });
  });

  router.put("/findings/:id/review", qa, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = reviewDecisionRequestSchema.parse(req.body);
    const found = await findingCall(pool, id);
    if (!found) throw new NotFoundError("finding not found");
    if (found.review_status === "done") throw new ConflictError("this review is already complete");
    const user = currentUser(req);
    await inTransaction(pool, async (client) => {
      await upsertReview(client, id, user.id, body.decision, body.note ?? null);
      // Each decision is audited, so a later overwrite keeps the earlier one on record.
      await audit(client, user.id, "finding_decided", found.call_id);
    });
    res.status(204).end();
  });

  router.post("/calls/:id/findings", qa, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = addFindingRequestSchema.parse(req.body);
    // The call's own rubric version: the dialog lists its items, not today's (review finding 7).
    const items = await scoreRubricItems(pool, id);
    if (!items) throw new ConflictError("this call has no open review");
    const item = items.find((i) => i.key === body.itemKey);
    if (!item) throw new AppError("unknown rubric item", 400, "validation_error");
    if (!statusFits(item, body.status))
      throw new AppError(
        `status ${body.status} does not fit a ${item.type} item`,
        400,
        "validation_error",
      );
    const segment =
      body.segmentSeq === undefined
        ? null
        : ((await calls.listSegments(pool, id)).find((s) => s.seq === body.segmentSeq) ?? null);
    if (body.segmentSeq !== undefined && !segment)
      throw new AppError("unknown transcript line", 400, "validation_error");
    const findingId = await addReviewerFinding(pool, {
      callId: id,
      itemKey: item.key,
      itemType: item.type,
      status: body.status,
      segment: segment
        ? {
            seq: segment.seq,
            startMs: segment.start_ms,
            endMs: segment.end_ms,
            channel: segment.channel,
            text: segment.text,
          }
        : null,
      note: body.note ?? null,
      reviewerId: currentUser(req).id,
    });
    if (!findingId) throw new ConflictError("this call has no open review");
    res.status(201).json({ id: findingId });
  });

  router.post("/calls/:id/review/complete", qa, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const user = currentUser(req);
    const outcome = await inTransaction(pool, async (client) => {
      const result = await completeReview(client, id, user.id);
      if (result === "done") {
        await rescoreAfterReview(client, id);
        await audit(client, user.id, "review_completed", id);
      }
      return result;
    });
    if (outcome === "undecided")
      throw new ConflictError("decide on every finding before completing the review");
    if (outcome === "not_pending") throw new ConflictError("this call has no open review");
    res.status(204).end();
  });

  router.get("/scorecard/me", requireRole("agent"), async (req, res) => {
    const user = currentUser(req);
    const card = user.agentId
      ? await scorecard(pool, user.agentId, (await rubricOrFail(deps)).items)
      : null;
    if (!card) throw new NotFoundError("no agent record linked to this account");
    res.json(card);
  });

  router.get("/scorecard/:id", qaOrManager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const card = await scorecard(pool, id, (await rubricOrFail(deps)).items);
    if (!card) throw new NotFoundError("agent not found");
    res.json(card);
  });

  router.get("/agreement", qaOrManager, async (_req, res) => {
    res.json(await agreement(pool, (await rubricOrFail(deps)).items));
  });

  router.get("/dashboard", manager, async (req, res) => {
    const q = dashboardQuerySchema.parse(req.query);
    res.json(await dashboard(pool, (await rubricOrFail(deps)).items, q));
  });

  router.get("/dashboard/leaderboard", manager, async (req, res) => {
    const q = leaderboardQuerySchema.parse(req.query);
    orderedRange(q);
    res.json(await leaderboard(pool, (await rubricOrFail(deps)).items, q));
  });

  router.get("/dashboard/highlights", manager, async (req, res) => {
    const q = highlightsQuerySchema.parse(req.query);
    orderedRange(q);
    res.json(await highlights(pool, (await rubricOrFail(deps)).items, q, new Date()));
  });

  // With productId: the rubric that scores that product (its own, or the default).
  router.get("/rubrics/active", async (req, res) => {
    const { productId } = rubricQuerySchema.parse(req.query);
    if (!productId) {
      res.json(await rubricOrFail(deps));
      return;
    }
    const rubric = await rubricFor(pool, productId);
    if (!rubric) throw new AppError("no active rubric; run the seed", 503, "no_rubric");
    res.json(rubric);
  });

  router.get("/rubrics", qaOrManager, async (req, res) => {
    const { productId } = rubricQuerySchema.parse(req.query);
    res.json({ items: await listRubrics(pool, productId ?? null) });
  });

  router.post("/rubrics", manager, async (req, res) => {
    const body = saveRubricRequestSchema.parse(req.body);
    const user = currentUser(req);
    if (body.productId) {
      const known = await pool.query("SELECT 1 FROM products WHERE id = $1", [body.productId]);
      if (known.rowCount === 0) throw new AppError("unknown product", 400, "validation_error");
    }
    const saved = await inTransaction(pool, async (client) => {
      const rubric = await saveRubricVersion(client, {
        name: body.name,
        items: body.items,
        createdBy: user.id,
        productId: body.productId,
      });
      await audit(client, user.id, "rubric_saved", null);
      return rubric;
    });
    res.status(201).json(saved);
  });

  router.get("/usage", manager, async (_req, res) => {
    res.json(await usageThisMonth(pool, deps.config.LLM_BUDGET_USD));
  });

  router.get("/usage/history", manager, async (req, res) => {
    const { days } = usageHistoryQuerySchema.parse(req.query);
    res.json(await usageHistory(pool, days));
  });

  return router;
}
