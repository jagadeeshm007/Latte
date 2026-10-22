import {
  BATCH_EXPORT_PARTS,
  batchExportQuerySchema,
  batchListQuerySchema,
  batchUpdateRequestSchema,
  MAX_ZIP_CALLS,
  type BatchDetail,
  type BatchExportPart,
  type Role,
} from "@scc/shared";
import { Router, type Response } from "express";
import type { Logger } from "pino";
import { z } from "zod";

import { currentUser, requireRole } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors.ts";
import { toCsv } from "../export/csv.ts";
import { EXPORT_LINK_SECONDS, signExportLink, verifyExportLink } from "../export/links.ts";
import { transcriptJson, transcriptText } from "../export/transcript.ts";
import { safeName, writeZip, type ZipEntry } from "../export/zip.ts";
import { STALE_SECONDS } from "../jobs/handlers.ts";
import { PRIORITY, QUEUES } from "../jobs/queue.ts";
import { perUserLimit } from "../rate-limit.ts";
import * as batches from "../repo/batches.ts";
import { listSegments, requeueForRetry } from "../repo/calls.ts";
import { activeRubric, audit, getProfile } from "../repo/reference.ts";

const idParam = z.object({ id: z.uuid() });
/** Who may work with batches: the roles that upload. */
const EXPORTERS: Role[] = ["qa_reviewer", "manager"];
const exportLinkRequestSchema = z.object({
  format: z.enum(["csv", "zip"]),
  include: z.array(z.enum(BATCH_EXPORT_PARTS)).max(BATCH_EXPORT_PARTS.length).default([]),
});
const HOUR = 60 * 60 * 1000;

/** attachment sets the download headers, with a plain-ASCII name and the full UTF-8 one. */
function attachment(res: Response, filename: string, type: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replaceAll('"', "_");
  res.setHeader("Content-Type", type);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  res.setHeader("Cache-Control", "no-store");
}

/** Batches: list, detail, rename and archive, retry failed calls, and exports (ADR-0017). */
export function batchesRouter(deps: AppDeps, exportSecret: Buffer): Router {
  const { pool, enqueue } = deps;
  const router = Router();
  const uploaders = requireRole(...EXPORTERS);
  const exporter = batchExporter(deps);
  const retryLimit = perUserLimit("batch-retry", 30, HOUR);
  const exportLimit = perUserLimit("export", 20, HOUR);

  const batchOr404 = async (id: string) => {
    const batch = await batches.getBatch(pool, id);
    if (!batch) throw new NotFoundError("batch not found");
    return batch;
  };

  router.get("/batches", uploaders, async (req, res) => {
    const q = batchListQuerySchema.parse(req.query);
    res.json(
      await batches.listBatches(pool, {
        q: q.q === "" ? undefined : q.q,
        state: q.state,
        archived: q.archived === "true",
        page: q.page,
        limit: q.limit,
      }),
    );
  });

  router.get("/batches/:id", uploaders, async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(await batchOr404(id));
  });

  router.patch("/batches/:id", uploaders, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = batchUpdateRequestSchema.parse(req.body);
    const user = currentUser(req);
    const batch = await batchOr404(id);
    // Whoever started the batch may rename or archive it, and any manager.
    if (batch.createdBy !== user.id && user.role !== "manager") {
      throw new ForbiddenError("only the person who started this batch or a manager can change it");
    }
    await inTransaction(pool, async (client) => {
      await batches.updateBatch(client, id, body);
      if (body.name !== undefined && body.name !== batch.name) {
        await audit(client, user.id, "batch_renamed", null, id);
      }
      if (body.archived !== undefined && body.archived !== (batch.archivedAt !== null)) {
        await audit(
          client,
          user.id,
          body.archived ? "batch_archived" : "batch_unarchived",
          null,
          id,
        );
      }
    });
    res.json(await batchOr404(id));
  });

  router.post("/batches/:id/retry-failed", uploaders, retryLimit, async (req, res) => {
    const { id } = idParam.parse(req.params);
    await batchOr404(id);
    let queued = 0;
    for (const callId of await batches.retryableCallIds(pool, id)) {
      const step = await requeueForRetry(pool, callId, STALE_SECONDS);
      if (!step) continue;
      await enqueue(
        step === "score" ? QUEUES.score : QUEUES.transcribe,
        { callId },
        { priority: PRIORITY.bulk },
      );
      queued++;
    }
    if (queued > 0) await batches.reopenBatch(pool, { batchId: id });
    await audit(pool, currentUser(req).id, "batch_retried", null, id);
    res.status(202).json({ queued });
  });

  router.get("/batches/:id/results.csv", uploaders, exportLimit, async (req, res) => {
    const { id } = idParam.parse(req.params);
    await exporter.csv(res, await batchOr404(id), currentUser(req).id);
  });

  router.get("/batches/:id/export.zip", uploaders, exportLimit, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { include } = batchExportQuerySchema.parse(req.query);
    await exporter.zip(req.log, res, await batchOr404(id), include, currentUser(req).id);
  });

  // A link the browser can open without its bearer token, valid for minutes.
  router.post("/batches/:id/export-link", uploaders, exportLimit, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = exportLinkRequestSchema.parse(req.body);
    const batch = await batchOr404(id);
    if (body.format === "zip") tooBigForZip(batch);
    const token = signExportLink(exportSecret, {
      batchId: id,
      userId: currentUser(req).id,
      format: body.format,
      include: body.include,
    });
    res.json({
      url: `/api/exports?token=${encodeURIComponent(token)}`,
      expiresInSeconds: EXPORT_LINK_SECONDS,
    });
  });

  return router;
}

/** tooBigForZip refuses a ZIP of more calls than can stream in reasonable time. */
function tooBigForZip(batch: BatchDetail) {
  if (batch.total > MAX_ZIP_CALLS) {
    throw new AppError(
      `a ZIP holds at most ${String(MAX_ZIP_CALLS)} calls; download the results CSV instead`,
      413,
      "too_many_calls",
    );
  }
}

/** batchExporter writes a batch's results CSV or ZIP to a response, audited as the given person. */
function batchExporter({ pool, storage }: Pick<AppDeps, "pool" | "storage">) {
  const text = (s: string) => new TextEncoder().encode(s);
  const results = async (batchId: string) => {
    const rubric = await activeRubric(pool);
    const rows = await batches.exportRows(pool, batchId);
    return { rows, csv: toCsv(batches.resultsTable(rows, rubric?.items ?? [])) };
  };

  return {
    async csv(res: Response, batch: BatchDetail, userId: string) {
      const { csv } = await results(batch.id);
      await audit(pool, userId, "batch_exported", null, batch.id);
      attachment(res, `${safeName(batch.name)}-results.csv`, "text/csv; charset=utf-8");
      res.send(csv);
    },

    async zip(
      log: Logger,
      res: Response,
      batch: BatchDetail,
      include: BatchExportPart[],
      userId: string,
    ) {
      tooBigForZip(batch);
      const { rows, csv } = await results(batch.id);
      await audit(pool, userId, "batch_exported", null, batch.id);
      const entries: ZipEntry[] = [
        { name: "results.csv", compress: true, load: () => Promise.resolve(text(csv)) },
      ];
      rows.forEach((r, i) => {
        // Numbered, so two calls with the same file name never overwrite each other.
        const base = `${String(i + 1).padStart(3, "0")}-${safeName(r.original_filename)}`;
        const stem = base.replace(/\.[^.]+$/, "");
        if (include.includes("transcripts")) {
          entries.push(
            {
              name: `transcripts/${stem}.txt`,
              compress: true,
              load: async () => text(transcriptText(await listSegments(pool, r.id), r.timed)),
            },
            {
              name: `transcripts/${stem}.json`,
              compress: true,
              load: async () => text(transcriptJson(await listSegments(pool, r.id), r.timed)),
            },
          );
        }
        if (include.includes("audio") && r.storage_path) {
          const path = r.storage_path;
          entries.push({
            name: `audio/${base}`,
            compress: false,
            load: () => storage.download(path),
          });
        }
      });

      attachment(res, `${safeName(batch.name)}.zip`, "application/zip");
      try {
        await writeZip(res, entries);
        res.end();
      } catch (error) {
        // Headers are gone: all that is left is to cut the download short and log why.
        log.error({ err: error, batchId: batch.id }, "batch zip failed part way");
        res.destroy(error instanceof Error ? error : undefined);
      }
    },
  };
}

/**
 * exportLinksRouter serves signed export links. It sits outside the bearer
 * check: the signature names the person, who must still exist and still be
 * allowed to export, and the batch, which must still exist.
 */
export function exportLinksRouter(deps: AppDeps, exportSecret: Buffer): Router {
  const router = Router();
  const exporter = batchExporter(deps);
  router.get("/exports", async (req, res) => {
    const { token } = z.object({ token: z.string().min(1).max(2000) }).parse(req.query);
    const link = verifyExportLink(exportSecret, token);
    if (!link) throw new UnauthorizedError("this download link is invalid or has expired");
    const profile = await getProfile(deps.pool, link.userId);
    if (!profile || !EXPORTERS.includes(profile.role)) {
      throw new ForbiddenError("this account can no longer export batches");
    }
    const batch = await batches.getBatch(deps.pool, link.batchId);
    if (!batch) throw new NotFoundError("batch not found");
    if (link.format === "csv") await exporter.csv(res, batch, profile.id);
    else await exporter.zip(req.log, res, batch, link.include, profile.id);
  });
  return router;
}
