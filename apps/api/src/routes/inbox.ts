import {
  digestSettingSchema,
  notificationQuerySchema,
  saveViewRequestSchema,
  savedViewQuerySchema,
  updateViewRequestSchema,
} from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { NotFoundError } from "../errors.ts";
import * as inbox from "../repo/inbox.ts";

const idParam = z.object({ id: z.uuid() });

/** Saved views, the inbox and digest settings, for whoever is signed in (ADR-0025). */
export function inboxRouter(deps: AppDeps): Router {
  const { pool } = deps;
  const router = Router();

  router.get("/saved-views", async (req, res) => {
    const { page } = savedViewQuerySchema.parse(req.query);
    res.json({ items: await inbox.listViews(pool, currentUser(req).id, page) });
  });

  router.post("/saved-views", async (req, res) => {
    const body = saveViewRequestSchema.parse(req.body);
    res.status(201).json(await inbox.insertView(pool, currentUser(req).id, body));
  });

  router.patch("/saved-views/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateViewRequestSchema.parse(req.body);
    const view = await inbox.updateView(pool, currentUser(req).id, id, body);
    // Someone else's view answers like a missing one (tenet 4).
    if (!view) throw new NotFoundError("saved view not found");
    res.json(view);
  });

  router.delete("/saved-views/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (!(await inbox.deleteView(pool, currentUser(req).id, id))) {
      throw new NotFoundError("saved view not found");
    }
    res.status(204).end();
  });

  router.get("/notifications", async (req, res) => {
    const q = notificationQuerySchema.parse(req.query);
    res.json(
      await inbox.listNotifications(pool, currentUser(req).id, {
        unread: q.unread === "true",
        page: q.page,
        limit: q.limit,
      }),
    );
  });

  router.get("/notifications/unread-count", async (req, res) => {
    res.json({ unread: await inbox.unreadCount(pool, currentUser(req).id) });
  });

  router.post("/notifications/read-all", async (req, res) => {
    res.json({ read: await inbox.markRead(pool, currentUser(req).id, null) });
  });

  router.post("/notifications/:id/read", async (req, res) => {
    const { id } = idParam.parse(req.params);
    await inbox.markRead(pool, currentUser(req).id, id);
    res.status(204).end();
  });

  router.get("/digest", async (req, res) => {
    res.json({ frequency: await inbox.getDigest(pool, currentUser(req).id) });
  });

  router.put("/digest", async (req, res) => {
    const { frequency } = digestSettingSchema.parse(req.body);
    await inbox.setDigest(pool, currentUser(req).id, frequency);
    res.json({ frequency });
  });

  return router;
}
