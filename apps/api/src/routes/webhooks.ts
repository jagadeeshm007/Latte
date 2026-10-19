import { randomBytes } from "node:crypto";

import {
  createWebhookRequestSchema,
  updateWebhookRequestSchema,
  webhookDeliveryQuerySchema,
} from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole } from "../auth.ts";
import { encryptSecret } from "../crypto.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { NotFoundError } from "../errors.ts";
import { audit } from "../repo/reference.ts";
import * as hooks from "../repo/webhooks.ts";

const idParam = z.object({ id: z.uuid() });
const deliveryParams = z.object({ id: z.uuid(), deliveryId: z.uuid() });

/**
 * Webhook endpoints (ADR-0021): managers, and API keys with webhooks:write,
 * register https endpoints, send a test event, read deliveries and redeliver.
 * The signing secret is shown once, then kept encrypted.
 */
export function webhooksRouter(deps: AppDeps): Router {
  const { pool } = deps;
  const router = Router();
  const manager = requireRole("manager");
  const keyHex = deps.config.DATA_ENCRYPTION_KEY;

  const endpointOr404 = async (id: string) => {
    const endpoint = await hooks.getEndpoint(pool, id);
    if (!endpoint) throw new NotFoundError("webhook endpoint not found");
    return endpoint;
  };

  router.get("/webhooks", manager, async (_req, res) => {
    res.json({ items: await hooks.listEndpoints(pool) });
  });

  router.post("/webhooks", manager, async (req, res) => {
    const body = createWebhookRequestSchema.parse(req.body);
    const user = currentUser(req);
    const secret = `whsec_${randomBytes(32).toString("base64url")}`;
    const ciphertext = encryptSecret(secret, keyHex);
    const id = await inTransaction(pool, async (client) => {
      const made = await hooks.insertEndpoint(client, {
        ...body,
        secretCiphertext: ciphertext,
        createdBy: user.id,
      });
      await audit(client, user.id, "webhook_created", null, null, req.apiKey?.id ?? null);
      return made;
    });
    res.status(201).json({ endpoint: await endpointOr404(id), secret });
  });

  router.get("/webhooks/:id", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(await endpointOr404(id));
  });

  router.patch("/webhooks/:id", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateWebhookRequestSchema.parse(req.body);
    await endpointOr404(id);
    await inTransaction(pool, async (client) => {
      await hooks.updateEndpoint(client, id, body);
      await audit(
        client,
        currentUser(req).id,
        "webhook_updated",
        null,
        null,
        req.apiKey?.id ?? null,
      );
    });
    res.json(await endpointOr404(id));
  });

  router.delete("/webhooks/:id", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    await inTransaction(pool, async (client) => {
      if (!(await hooks.deleteEndpoint(client, id)))
        throw new NotFoundError("webhook endpoint not found");
      await audit(
        client,
        currentUser(req).id,
        "webhook_deleted",
        null,
        null,
        req.apiKey?.id ?? null,
      );
    });
    res.status(204).end();
  });

  router.post("/webhooks/:id/test", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    await endpointOr404(id);
    await hooks.emitEvent(pool, "ping", { message: "A test event from Latte" }, id);
    res.status(202).json({ queued: 1 });
  });

  router.get("/webhooks/:id/deliveries", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const q = webhookDeliveryQuerySchema.parse(req.query);
    await endpointOr404(id);
    res.json(await hooks.listDeliveries(pool, id, q));
  });

  router.post("/webhooks/:id/deliveries/:deliveryId/redeliver", manager, async (req, res) => {
    const { id, deliveryId } = deliveryParams.parse(req.params);
    if (!(await hooks.redeliver(pool, id, deliveryId)))
      throw new NotFoundError("delivery not found");
    res.status(202).json({ queued: 1 });
  });

  return router;
}
