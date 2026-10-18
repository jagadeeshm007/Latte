import { alertRuleRequestSchema } from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { NotFoundError } from "../errors.ts";
import * as alerts from "../repo/alerts.ts";

const idParam = z.object({ id: z.uuid() });

/** Alert rules and their firings, for managers (ADR-0025). */
export function alertsRouter(deps: AppDeps): Router {
  const { pool } = deps;
  const router = Router();
  const manager = requireRole("manager");

  const ruleOr404 = async (id: string) => {
    const rule = await alerts.getRule(pool, id);
    if (!rule) throw new NotFoundError("alert rule not found");
    return rule;
  };

  router.get("/alert-rules", manager, async (_req, res) => {
    res.json({ items: await alerts.listRules(pool) });
  });

  router.post("/alert-rules", manager, async (req, res) => {
    const body = alertRuleRequestSchema.parse(req.body);
    const id = await alerts.insertRule(pool, body, currentUser(req).id);
    res.status(201).json(await ruleOr404(id));
  });

  router.put("/alert-rules/:id", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = alertRuleRequestSchema.parse(req.body);
    if (!(await alerts.replaceRule(pool, id, body)))
      throw new NotFoundError("alert rule not found");
    res.json(await ruleOr404(id));
  });

  router.delete("/alert-rules/:id", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (!(await alerts.deleteRule(pool, id))) throw new NotFoundError("alert rule not found");
    res.status(204).end();
  });

  router.get("/alert-firings", manager, async (req, res) => {
    const { ruleId } = z.object({ ruleId: z.uuid().optional() }).parse(req.query);
    res.json({ items: await alerts.listFirings(pool, ruleId ?? null) });
  });

  return router;
}
