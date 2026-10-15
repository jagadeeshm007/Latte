import { randomUUID } from "node:crypto";

import {
  callListQuerySchema,
  MAX_UPLOAD_FILES,
  uploadConfirmRequestSchema,
  uploadSignRequestSchema,
  type CallDetail,
} from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole, scopeOf } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { AppError, ConflictError, NotFoundError } from "../errors.ts";
import { QUEUES } from "../jobs/queue.ts";
import * as calls from "../repo/calls.ts";
import {
  activeRubric,
  audit,
  getReference,
  listRubrics,
  referenceExists,
} from "../repo/reference.ts";
import { getScore, listFindings } from "../repo/scores.ts";

const idParam = z.object({ id: z.uuid() });

/** Upload, list, detail, audio and retry (US-01-001, US-01-002, US-02-003). */
export function callsRouter(deps: AppDeps): Router {
  const { pool, storage, enqueue, config } = deps;
  const router = Router();
  const uploaders = requireRole("qa_reviewer", "manager");

  router.get("/reference", uploaders, async (_req, res) => {
    res.json(await getReference(pool));
  });

  router.post("/uploads/sign", uploaders, async (req, res) => {
    const body = uploadSignRequestSchema.parse(req.body);
    const user = currentUser(req);
    const uploads = await Promise.all(
      body.files.map(async (f) => {
        const ext = f.type === "audio/mpeg" ? "mp3" : "wav";
        // The path carries the uploader's id, so confirm can refuse a path issued to someone else (T12).
        const path = `${user.id}/${randomUUID()}.${ext}`;
        return { path, ...(await storage.signUpload(path)) };
      }),
    );
    res.json({ uploads });
  });

  router.post("/uploads/confirm", uploaders, async (req, res) => {
    const body = uploadConfirmRequestSchema.parse(req.body);
    const user = currentUser(req);
    for (const f of body.files) {
      if (!f.path.startsWith(`${user.id}/`)) {
        throw new AppError("upload path was not issued to you", 403, "forbidden");
      }
      if (!(await referenceExists(pool, f.agentId, f.teamId, f.productId))) {
        throw new AppError("unknown agent, team or product", 400, "validation_error");
      }
      if (!(await storage.exists(f.path))) {
        throw new AppError(`file ${f.originalFilename} was not uploaded`, 400, "upload_missing");
      }
    }
    const batchId = randomUUID();
    const callIds = await inTransaction(pool, async (client) => {
      const ids: string[] = [];
      for (const f of body.files) {
        const id = await calls.insertCall(client, {
          agentId: f.agentId,
          teamId: f.teamId,
          productId: f.productId,
          callDate: f.callDate,
          batchId,
          uploadedBy: user.id,
          originalFilename: f.originalFilename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          storagePath: f.path,
          retentionDays: config.AUDIO_RETENTION_DAYS,
        });
        await audit(client, user.id, "call_uploaded", id);
        ids.push(id);
      }
      return ids;
    });
    for (const callId of callIds) {
      await enqueue(QUEUES.transcribe, { callId });
    }
    req.log.info({ batchId, files: callIds.length, max: MAX_UPLOAD_FILES }, "upload confirmed");
    res.status(201).json({ batchId, callIds });
  });

  router.get("/calls", async (req, res) => {
    const q = callListQuerySchema.parse(req.query);
    const user = currentUser(req);
    res.json(
      await calls.listCalls(pool, scopeOf(user), {
        status: q.status,
        needsReview: q.needsReview === undefined ? undefined : q.needsReview === "true",
        agentId: q.agentId,
        limit: q.limit,
        cursor: q.cursor,
      }),
    );
  });

  router.get("/calls/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const user = currentUser(req);
    const summary = await calls.getCallSummary(pool, scopeOf(user), id);
    if (!summary) throw new NotFoundError("call not found");
    const [row, score, findings, segments] = await Promise.all([
      calls.getCallRow(pool, scopeOf(user), id),
      getScore(pool, id),
      listFindings(pool, id),
      calls.listSegments(pool, id),
    ]);
    const rubrics = await listRubrics(pool);
    const rubric =
      rubrics.find((r) => r.version === score?.rubric_version) ?? (await activeRubric(pool));
    const detail: CallDetail = {
      call: summary,
      audioAvailable: Boolean(row?.storage_path),
      score: score
        ? {
            id: score.id,
            rubricVersion: score.rubric_version,
            talkRatio: score.talk_ratio,
            coachingNotes: score.coaching_notes,
            judgeError: score.judge_error,
            reviewedBy: score.reviewed_by_name,
            reviewedAt: score.reviewed_at?.toISOString() ?? null,
          }
        : null,
      rubricItems: rubric?.items ?? [],
      segments: segments.map((s) => ({
        seq: s.seq,
        channel: s.channel,
        startMs: s.start_ms,
        endMs: s.end_ms,
        text: s.text,
        language: s.language,
        avgLogprob: s.avg_logprob,
      })),
      findings,
    };
    res.json(detail);
  });

  router.post("/calls/:id/audio-url", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const user = currentUser(req);
    const row = await calls.getCallRow(pool, scopeOf(user), id);
    if (!row) throw new NotFoundError("call not found");
    if (!row.storage_path)
      throw new AppError("the audio for this call has been deleted", 410, "audio_purged");
    const url = await storage.signDownload(row.storage_path, config.SIGNED_URL_SECONDS);
    await audit(pool, user.id, "audio_url_issued", id);
    res.json({ url, expiresInSeconds: config.SIGNED_URL_SECONDS });
  });

  router.post("/calls/:id/retry", uploaders, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const row = await calls.getCallRow(pool, { agentId: null }, id);
    if (!row) throw new NotFoundError("call not found");
    const score = await getScore(pool, id);
    const segments = await calls.listSegments(pool, id);
    const unscored =
      row.status === "scored" && score?.judge_error && score.review_status !== "done";
    if (row.status !== "failed" && !unscored) {
      throw new ConflictError("only a failed or unscored call can be retried");
    }
    if (segments.length > 0) {
      await calls.setStatus(pool, id, "transcribed");
      await enqueue(QUEUES.score, { callId: id });
    } else {
      await calls.setStatus(pool, id, "uploaded");
      await enqueue(QUEUES.transcribe, { callId: id });
    }
    res.status(202).json({ status: "queued" });
  });

  return router;
}
