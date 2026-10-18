import { billingPricesSchema, statementQuerySchema } from "@scc/shared";
import { Router } from "express";

import { currentUser, requireRole } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { getPrices, setPrices, statement } from "../repo/billing.ts";
import { audit } from "../repo/reference.ts";

/** Usage statements and the price list, for managers (ADR-0026). */
export function billingRouter(deps: AppDeps): Router {
  const { pool } = deps;
  const router = Router();
  const manager = requireRole("manager");

  router.get("/billing/prices", manager, async (_req, res) => {
    res.json(await getPrices(pool));
  });

  router.put("/billing/prices", manager, async (req, res) => {
    const body = billingPricesSchema.parse(req.body);
    const user = currentUser(req);
    await inTransaction(pool, async (client) => {
      await setPrices(client, body, user.id);
      await audit(client, user.id, "billing_prices_updated", null);
    });
    res.json(await getPrices(pool));
  });

  router.get("/billing/statement", manager, async (req, res) => {
    const { month } = statementQuerySchema.parse(req.query);
    res.json(await statement(pool, month));
  });

  return router;
}
