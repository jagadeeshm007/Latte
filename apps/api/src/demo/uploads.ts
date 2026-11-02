import { DEMO_MAX_CHARACTERS, DEMO_MAX_LINES } from "@scc/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";

import { inTransaction } from "../db/pool.ts";
import { AppError } from "../errors.ts";
import type { DemoContext } from "./context.ts";

// The demo's one upload (ADR-0033): one small transcript per device, and at
// most the day's cap across every visitor. The device and the day are
// claimed in one transaction before the upload runs; the device's primary
// key makes a second claim fail, so two uploads at once give one call. An
// upload that then fails gives its claim back.

const today = "(now() AT TIME ZONE 'UTC')::date";

/** Only the shape the size check needs; everything else is the route's own validation. */
const sizeShape = z.object({
  transcripts: z.array(z.object({ lines: z.array(z.object({ text: z.string() })) })),
});

function checkSize(body: unknown): void {
  const parsed = sizeShape.safeParse(body);
  // A body the route cannot read is left to the route's own validation.
  if (!parsed.success) return;
  const { transcripts } = parsed.data;
  const lines = transcripts.flatMap((t) => t.lines);
  const characters = lines.reduce((sum, line) => sum + line.text.length, 0);
  if (
    transcripts.length !== 1 ||
    lines.length > DEMO_MAX_LINES ||
    characters > DEMO_MAX_CHARACTERS
  ) {
    throw new AppError(
      `The demo takes one transcript of up to ${String(DEMO_MAX_LINES)} lines and ${DEMO_MAX_CHARACTERS.toLocaleString("en")} characters.`,
      422,
      "demo_upload_too_large",
    );
  }
}

/** claimUpload takes the device's one upload and a place under the day's cap, or throws 409 or 429. */
async function claimUpload(demo: DemoContext, fingerprint: string): Promise<void> {
  await inTransaction(demo.pool, async (db) => {
    const device = await db.query(
      "INSERT INTO device_uploads (fingerprint_hash) VALUES ($1) ON CONFLICT DO NOTHING RETURNING 1",
      [fingerprint],
    );
    if (device.rowCount === 0) {
      throw new AppError(
        "You have used the demo upload on this device. Your call is in Calls; ask us for a full trial to upload more.",
        409,
        "demo_upload_used",
      );
    }
    const day = await db.query(
      `INSERT INTO daily_uploads (day, uploads) VALUES (${today}, 1)
       ON CONFLICT (day) DO UPDATE SET uploads = daily_uploads.uploads + 1
       WHERE daily_uploads.uploads < $1 RETURNING uploads`,
      [demo.dailyUploads],
    );
    if (day.rowCount === 0) {
      throw new AppError(
        "The demo has reached today's upload limit. Please try again tomorrow.",
        429,
        "demo_busy",
      );
    }
  });
}

async function releaseUpload(demo: DemoContext, fingerprint: string): Promise<void> {
  await inTransaction(demo.pool, async (db) => {
    await db.query("DELETE FROM device_uploads WHERE fingerprint_hash = $1", [fingerprint]);
    await db.query(
      `UPDATE daily_uploads SET uploads = GREATEST(uploads - 1, 0) WHERE day = ${today}`,
    );
  });
}

/** demoUploadLimit guards POST /uploads/transcripts on the demo branch. */
export function demoUploadLimit(demo: DemoContext): RequestHandler {
  return async (req, res, next) => {
    if (req.method !== "POST" || req.path !== "/uploads/transcripts" || !req.demo) {
      next();
      return;
    }
    checkSize(req.body);
    await claimUpload(demo, req.demo.fingerprint);
    res.locals.demoUploadClaim = req.demo.fingerprint;
    next();
  };
}

/**
 * demoUploadRelease gives the claim back when the upload fails, before the
 * error is answered, so the visitor can correct it and try again.
 */
export function demoUploadRelease(demo: DemoContext): ErrorRequestHandler {
  return async (error: unknown, _req, res, next) => {
    const claim: unknown = res.locals.demoUploadClaim;
    if (typeof claim === "string") {
      delete res.locals.demoUploadClaim;
      await releaseUpload(demo, claim);
    }
    next(error);
  };
}
