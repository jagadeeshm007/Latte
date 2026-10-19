import {
  apiKeyLogsQuerySchema,
  apiKeyMetricsQuerySchema,
  createApiKeyRequestSchema,
  revokeAllKeysRequestSchema,
  updateApiKeyRequestSchema,
} from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { ConflictError, NotFoundError } from "../errors.ts";
import * as keys from "../repo/api-keys.ts";
import { audit } from "../repo/reference.ts";

const idParam = z.object({ id: z.uuid() });

/**
 * API keys for managers (ADR-0018): create (the secret is shown once), rename
 * and set limits, revoke, and read each key's metrics and request log. Keys
 * themselves never reach these routes: apiKeyGate does not list them.
 */
export function apiKeysRouter(deps: AppDeps): Router {
  const { pool } = deps;
  const router = Router();
  const manager = requireRole("manager");

  const keyOr404 = async (id: string) => {
    const key = await keys.getKey(pool, id);
    if (!key) throw new NotFoundError("API key not found");
    return key;
  };

  router.get("/api-keys", manager, async (_req, res) => {
    res.json({ items: await keys.listKeys(pool) });
  });

  router.post("/api-keys", manager, async (req, res) => {
    const body = createApiKeyRequestSchema.parse(req.body);
    const user = currentUser(req);
    const created = await inTransaction(pool, async (client) => {
      const made = await keys.insertKey(client, { ...body, createdBy: user.id });
      await audit(client, user.id, "api_key_created", null, null, made.id);
      return made;
    });
    res.status(201).json({ key: await keyOr404(created.id), secret: created.token });
  });

  // Before /api-keys/:id, so "revoke-all" is never read as an id.
  router.post("/api-keys/revoke-all", manager, async (req, res) => {
    revokeAllKeysRequestSchema.parse(req.body);
    const user = currentUser(req);
    const revoked = await inTransaction(pool, async (client) => {
      const ids = await keys.revokeAllKeys(client);
      await audit(client, user.id, "api_keys_revoked_all", null);
      return ids;
    });
    res.json({ revoked: revoked.length });
  });

  router.post("/api-keys/:id/rotate", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    await keyOr404(id);
    const user = currentUser(req);
    const fresh = await inTransaction(pool, async (client) => {
      const made = await keys.rotateKey(client, id, user.id);
      if (!made) throw new ConflictError("only a live key can be rotated");
      await audit(client, user.id, "api_key_rotated", null, null, id);
      return made;
    });
    res.status(201).json({ key: await keyOr404(fresh.id), secret: fresh.token });
  });

  router.get("/api-keys/:id", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(await keyOr404(id));
  });

  router.patch("/api-keys/:id", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateApiKeyRequestSchema.parse(req.body);
    await keyOr404(id);
    const user = currentUser(req);
    await inTransaction(pool, async (client) => {
      if (!(await keys.updateKey(client, id, body))) {
        throw new ConflictError("a revoked key cannot be changed");
      }
      await audit(client, user.id, "api_key_updated", null, null, id);
    });
    res.json(await keyOr404(id));
  });

  router.post("/api-keys/:id/revoke", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    await keyOr404(id);
    const user = currentUser(req);
    await inTransaction(pool, async (client) => {
      if (await keys.revokeKey(client, id)) {
        await audit(client, user.id, "api_key_revoked", null, null, id);
      }
    });
    res.status(204).end();
  });

  router.get("/api-keys/:id/metrics", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { days } = apiKeyMetricsQuerySchema.parse(req.query);
    res.json(await keys.keyMetrics(pool, await keyOr404(id), days));
  });

  router.get("/api-keys/:id/logs", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const q = apiKeyLogsQuerySchema.parse(req.query);
    await keyOr404(id);
    res.json(await keys.keyLogs(pool, id, q));
  });

  return router;
}
