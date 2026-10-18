import { randomUUID } from "node:crypto";

import {
  audioUrlRequestSchema,
  callDetailQuerySchema,
  findPii,
  redactText,
  redactWords,
  callListQuerySchema,
  MAX_BATCH_FILES,
  MAX_UPLOAD_FILES,
  uploadConfirmRequestSchema,
  uploadSignRequestSchema,
  type CallDetail,
} from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole, scopeOf } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction, type Client } from "../db/pool.ts";
import { AppError, ConflictError, NotFoundError } from "../errors.ts";
import { STALE_SECONDS } from "../jobs/handlers.ts";
import { PRIORITY, QUEUES } from "../jobs/queue.ts";
import { perUserLimit } from "../rate-limit.ts";
import * as batches from "../repo/batches.ts";
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
/** A confirm with more files than this is bulk work, queued behind one-off uploads. */
const BULK_FROM_FILES = 10;

/**
 * batchForUpload returns the batch a confirm fills: one the caller started
 * (locked, so two chunks cannot overfill it), or a new one.
 */
async function batchForUpload(
  db: Client,
  userId: string,
  body: { files: unknown[]; batchId?: string | undefined; batchName?: string | undefined },
  apiKeyId: string | null,
): Promise<string> {
  if (body.batchId) {
    const batch = await batches.lockBatchForUpload(db, body.batchId);
    if (batch?.createdBy !== userId) throw new NotFoundError("batch not found");
    if (batch.archived) throw new ConflictError("this batch is archived");
    if (batch.calls + body.files.length > MAX_BATCH_FILES) {
      throw new ConflictError(`a batch holds at most ${String(MAX_BATCH_FILES)} calls`);
    }
    return body.batchId;
  }
  const name =
    body.batchName ?? `Upload ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  const id = await batches.insertBatch(db, {
    name,
    createdBy: userId,
    source: apiKeyId ? "api" : "web",
    apiKeyId,
  });
  await audit(db, userId, "batch_created", null, id, apiKeyId);
  return id;
}

/** Upload, list, detail, audio and retry (US-01-001, US-01-002, US-02-003). */
export function callsRouter(deps: AppDeps): Router {
  const { pool, storage, enqueue, config } = deps;
  const router = Router();
  const uploaders = requireRole("qa_reviewer", "manager");
  const signLimit = perUserLimit("upload", 60, 60 * 60 * 1000);
  const confirmLimit = perUserLimit("upload", 30, 60 * 60 * 1000);
  const retryLimit = perUserLimit("retry", 60, 60 * 60 * 1000);

  router.get("/reference", uploaders, async (_req, res) => {
    res.json(await getReference(pool));
  });

  router.post("/uploads/sign", uploaders, signLimit, async (req, res) => {
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

  router.post("/uploads/confirm", uploaders, confirmLimit, async (req, res) => {
    const body = uploadConfirmRequestSchema.parse(req.body);
    const user = currentUser(req);
    for (const f of body.files) {
      // Exactly the shape /uploads/sign issues for this user, nothing more (T12).
      if (!new RegExp(`^${user.id}/[0-9a-f-]{36}\\.(wav|mp3)$`).test(f.path)) {
        throw new AppError("upload path was not issued to you", 403, "forbidden");
      }
      if (!(await referenceExists(pool, f.agentId, f.teamId, f.productId))) {
        throw new AppError("unknown agent, team or product", 400, "validation_error");
      }
      if (!(await storage.exists(f.path))) {
        throw new AppError(`file ${f.originalFilename} was not uploaded`, 400, "upload_missing");
      }
    }
    if (new Set(body.files.map((f) => f.path)).size !== body.files.length) {
      throw new ConflictError("the same file is listed twice");
    }
    const { batchId, callIds } = await inTransaction(pool, async (client) => {
      const batchId = await batchForUpload(client, user.id, body, req.apiKey?.id ?? null);
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
          language: f.language,
        });
        await audit(client, user.id, "call_uploaded", id);
        ids.push(id);
      }
      return { batchId, callIds: ids };
    }).catch((error: unknown) => {
      // uq_calls_storage_path: each uploaded object becomes one call, once.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictError("this file has already been confirmed");
      }
      throw error;
    });
    // Chunks of a large batch wait behind one-off uploads.
    const bulk = body.batchId !== undefined || body.files.length > BULK_FROM_FILES;
    for (const callId of callIds) {
      await enqueue(
        QUEUES.transcribe,
        { callId },
        { priority: bulk ? PRIORITY.bulk : PRIORITY.interactive },
      );
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
        teamId: q.teamId,
        productId: q.productId,
        language: q.language,
        batchId: q.batchId,
        flag: q.flag,
        q: q.q === "" ? undefined : q.q,
        archived: q.archived === "true",
        groupBy: q.groupBy,
        limit: q.limit,
        page: q.page,
        cursor: q.cursor,
      }),
    );
  });

  router.get("/calls/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { reveal } = callDetailQuerySchema.parse(req.query);
    const user = currentUser(req);
    // Personal data is masked unless QA or a manager, signed in to the app, asks to see it (ADR-0023).
    const showPii =
      reveal === "pii" && !req.apiKey && (user.role === "qa_reviewer" || user.role === "manager");
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
    let redactions = 0;
    const mask = (text: string) => {
      if (showPii) return text;
      const spans = findPii(text);
      redactions += spans.length;
      return redactText(text, spans);
    };
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
        text: mask(s.text),
        language: s.language,
        avgLogprob: s.avg_logprob,
        words: showPii ? s.words : redactWords(s.words).words,
        translation: s.text_en === null ? null : mask(s.text_en),
      })),
      findings: findings.map((f) => ({ ...f, quote: f.quote === null ? null : mask(f.quote) })),
      redactions,
    };
    if (showPii) await audit(pool, user.id, "pii_revealed", id);
    res.json(detail);
  });

  router.post("/calls/:id/audio-url", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const user = currentUser(req);
    const row = await calls.getCallRow(pool, scopeOf(user), id);
    if (!row) throw new NotFoundError("call not found");
    if (!row.storage_path)
      throw new AppError("the audio for this call has been deleted", 410, "audio_purged");
    const { download } = audioUrlRequestSchema.parse(req.body ?? {});
    const name = download
      ? (await calls.getCallSummary(pool, scopeOf(user), id))?.originalFilename
      : undefined;
    const url = await storage.signDownload(row.storage_path, config.SIGNED_URL_SECONDS, name);
    await audit(pool, user.id, "audio_url_issued", id);
    res.json({ url, expiresInSeconds: config.SIGNED_URL_SECONDS });
  });

  router.post("/calls/:id/retry", uploaders, retryLimit, async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (!(await calls.getCallRow(pool, { agentId: null }, id)))
      throw new NotFoundError("call not found");
    const step = await calls.requeueForRetry(pool, id, STALE_SECONDS);
    if (!step) throw new ConflictError("only a failed, unscored or stuck call can be retried");
    await batches.reopenBatch(pool, { callId: id });
    await enqueue(step === "score" ? QUEUES.score : QUEUES.transcribe, { callId: id });
    await audit(pool, currentUser(req).id, "call_retried", id);
    res.status(202).json({ status: "queued" });
  });

  // Archive and delete only hide a call (ADR-0015); each change is audited.
  for (const [path, archived, action] of [
    ["archive", true, "call_archived"],
    ["unarchive", false, "call_unarchived"],
  ] as const) {
    router.post(`/calls/:id/${path}`, uploaders, async (req, res) => {
      const { id } = idParam.parse(req.params);
      const user = currentUser(req);
      await inTransaction(pool, async (client) => {
        if (!(await calls.setArchived(client, scopeOf(user), id, archived)))
          throw new NotFoundError("call not found");
        await audit(client, user.id, action, id);
      });
      res.status(204).end();
    });
  }

  router.post("/calls/:id/delete", requireRole("manager"), async (req, res) => {
    const { id } = idParam.parse(req.params);
    const user = currentUser(req);
    await inTransaction(pool, async (client) => {
      if (!(await calls.softDelete(client, id))) throw new NotFoundError("call not found");
      await audit(client, user.id, "call_deleted", id);
    });
    res.status(204).end();
  });

  return router;
}
