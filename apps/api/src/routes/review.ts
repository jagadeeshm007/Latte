import {
  addFindingRequestSchema,
  dashboardQuerySchema,
  reviewDecisionRequestSchema,
  saveRubricRequestSchema,
  statusFits,
} from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { AppError, ConflictError, NotFoundError } from "../errors.ts";
import { agreement, dashboard, scorecard } from "../repo/analytics.ts";
import * as calls from "../repo/calls.ts";
import {
  activeRubric,
  audit,
  listRubrics,
  saveRubricVersion,
  usageThisMonth,
} from "../repo/reference.ts";
import { addReviewerFinding, completeReview, findingCall, upsertReview } from "../repo/scores.ts";


const idParam = z.object({ id: z.uuid() });

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
      "SELECT call_id AS id FROM scores WHERE review_status = 'pending' ORDER BY created_at LIMIT 100",
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
    await upsertReview(pool, id, currentUser(req).id, body.decision, body.note ?? null);
    res.status(204).end();
  });

  router.post("/calls/:id/findings", qa, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = addFindingRequestSchema.parse(req.body);
    const rubric = await rubricOrFail(deps);
    const item = rubric.items.find((i) => i.key === body.itemKey);
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
      if (result === "done") await audit(client, user.id, "review_completed", id);
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

  router.get("/rubrics/active", async (_req, res) => {
    res.json(await rubricOrFail(deps));
  });

  router.get("/rubrics", qaOrManager, async (_req, res) => {
    res.json({ items: await listRubrics(pool) });
  });

  router.post("/rubrics", manager, async (req, res) => {
    const body = saveRubricRequestSchema.parse(req.body);
    const user = currentUser(req);
    const saved = await inTransaction(pool, async (client) => {
      const rubric = await saveRubricVersion(client, {
        name: body.name,
        items: body.items,
        createdBy: user.id,
      });
      await audit(client, user.id, "rubric_saved", null);
      return rubric;
    });
    res.status(201).json(saved);
  });

  router.get("/usage", manager, async (_req, res) => {
    res.json(await usageThisMonth(pool, deps.config.LLM_BUDGET_USD));
  });

  return router;
}
