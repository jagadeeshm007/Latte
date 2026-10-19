import { updateTeamRequestSchema } from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { NotFoundError } from "../errors.ts";
import { audit } from "../repo/reference.ts";
import { listTeams, setTeamRetention } from "../repo/teams.ts";

const idParam = z.object({ id: z.uuid() });

/** Team settings for managers: how long each team's recordings are kept (ADR-0023). */
export function teamsRouter(deps: AppDeps): Router {
  const { pool, config } = deps;
  const router = Router();
  const manager = requireRole("manager");

  router.get("/teams", manager, async (_req, res) => {
    res.json({
      items: await listTeams(pool, config.AUDIO_RETENTION_DAYS),
      defaultRetentionDays: config.AUDIO_RETENTION_DAYS,
    });
  });

  router.patch("/teams/:id", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { audioRetentionDays } = updateTeamRequestSchema.parse(req.body);
    await inTransaction(pool, async (client) => {
      if (!(await setTeamRetention(client, id, audioRetentionDays, config.AUDIO_RETENTION_DAYS))) {
        throw new NotFoundError("team not found");
      }
      await audit(client, currentUser(req).id, "team_retention_changed", null);
    });
    const team = (await listTeams(pool, config.AUDIO_RETENTION_DAYS)).find((t) => t.id === id);
    res.json(team);
  });

  return router;
}
