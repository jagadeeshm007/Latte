import { postNoticeRequestSchema, type Status } from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { NotFoundError } from "../errors.ts";
import { audit } from "../repo/reference.ts";
import { postNotice, resolveNotice, status } from "../repo/status.ts";

const idParam = z.object({ id: z.uuid() });
/** The public page is answered from memory for this long, so it cannot be used to load the database. */
const CACHE_MS = 30_000;

/** publicStatusRouter serves GET /status to anyone, signed in or not (ADR-0026). */
export function publicStatusRouter(deps: AppDeps, now: () => number = Date.now): Router {
  const router = Router();
  let cached: { at: number; value: Status } | null = null;
  router.get("/status", async (_req, res) => {
    if (!cached || now() - cached.at > CACHE_MS) {
      cached = { at: now(), value: await status(deps, new Date(now())) };
    }
    res.setHeader("Cache-Control", "public, max-age=30");
    res.json(cached.value);
  });
  return router;
}

/** Status notices, posted and resolved by managers. */
export function statusNoticesRouter(deps: AppDeps): Router {
  const { pool } = deps;
  const router = Router();
  const manager = requireRole("manager");

  router.post("/status/notices", manager, async (req, res) => {
    const body = postNoticeRequestSchema.parse(req.body);
    const user = currentUser(req);
    const id = await inTransaction(pool, async (client) => {
      const made = await postNotice(client, body, user.id);
      await audit(client, user.id, "status_notice_posted", null);
      return made;
    });
    res.status(201).json({ id });
  });

  router.post("/status/notices/:id/resolve", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    await inTransaction(pool, async (client) => {
      if (!(await resolveNotice(client, id))) throw new NotFoundError("open notice not found");
      await audit(client, currentUser(req).id, "status_notice_resolved", null);
    });
    res.status(204).end();
  });

  return router;
}
