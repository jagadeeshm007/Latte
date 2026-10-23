import { updateMeRequestSchema } from "@scc/shared";
import { Router } from "express";

import { currentUser } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { NotFoundError } from "../errors.ts";
import { audit, renameProfile } from "../repo/reference.ts";

/** The caller's own profile. API keys reach only GET (api-access.ts lists no PATCH /me). */
export function meRouter({ pool }: AppDeps): Router {
  const router = Router();

  router.get("/me", (req, res) => {
    res.json(currentUser(req));
  });

  router.patch("/me", async (req, res) => {
    const { displayName } = updateMeRequestSchema.parse(req.body);
    const user = currentUser(req);
    const me = await inTransaction(pool, async (client) => {
      const renamed = await renameProfile(client, user.id, displayName);
      if (!renamed) throw new NotFoundError("profile not found");
      await audit(client, user.id, "member_updated", null);
      return renamed;
    });
    res.json(me);
  });

  return router;
}
