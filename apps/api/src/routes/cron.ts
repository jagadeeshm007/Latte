import { createHash, timingSafeEqual } from "node:crypto";

import { Router, type RequestHandler } from "express";

import { UnauthorizedError } from "../errors.ts";

// Vercel Cron calls these with GET and "Authorization: Bearer $CRON_SECRET"
// (ADR-0020). Without a secret configured the routes refuse everything, so a
// deployment that forgot it cannot be driven by strangers.

export const CRON_TASKS = ["work", "purge", "alerts", "digests", "status"] as const;
export type CronTask = (typeof CRON_TASKS)[number];

/** One function per task; each returns a small summary that is logged and answered. */
export type CronJobs = Record<CronTask, () => Promise<Record<string, unknown>>>;

const digest = (value: string) => createHash("sha256").update(value).digest();

/** cronSecretMatches compares in constant time; hashing first evens out the lengths. */
export function cronSecretMatches(header: string | undefined, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}

function requireCronSecret(secret: string | undefined): RequestHandler {
  return (req, _res, next) => {
    if (!cronSecretMatches(req.headers.authorization, secret)) {
      next(new UnauthorizedError("This endpoint is for the scheduler only"));
      return;
    }
    next();
  };
}

/** cronRouter serves GET /cron/<task> for each scheduled task. */
export function cronRouter(secret: string | undefined, jobs: CronJobs): Router {
  const router = Router();
  router.use("/cron", requireCronSecret(secret));
  for (const task of CRON_TASKS) {
    router.get(`/cron/${task}`, async (req, res) => {
      const started = Date.now();
      const summary = await jobs[task]();
      req.log.info({ task, ms: Date.now() - started, ...summary }, "cron task finished");
      res.setHeader("Cache-Control", "no-store");
      res.json({ task, ...summary });
    });
  }
  return router;
}
