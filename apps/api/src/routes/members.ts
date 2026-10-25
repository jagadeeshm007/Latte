import { inviteMemberRequestSchema, updateMemberRequestSchema } from "@scc/shared";
import { Router } from "express";
import { z } from "zod";

import { currentUser, requireRole } from "../auth.ts";
import type { AppDeps } from "./deps.ts";
import { inTransaction } from "../db/pool.ts";
import { AppError, ConflictError, NotFoundError, ServiceUnavailableError } from "../errors.ts";
import { emailTaken, insertMember, listMembers, updateMember } from "../repo/members.ts";
import { audit } from "../repo/reference.ts";

const idParam = z.object({ id: z.uuid() });

/**
 * Members, for managers (ADR-0024): invite people with a role, change roles,
 * and turn accounts off. Latte is invite-only: signing in with Google,
 * Microsoft or SAML works only for someone a manager invited.
 */
export function membersRouter(deps: AppDeps): Router {
  const { pool } = deps;
  const router = Router();
  const manager = requireRole("manager");

  router.get("/members", manager, async (_req, res) => {
    res.json({ items: await listMembers(pool) });
  });

  router.post("/members", manager, async (req, res) => {
    const body = inviteMemberRequestSchema.parse(req.body);
    if (!deps.authAdmin) throw new ServiceUnavailableError("inviting is not set up on this server");
    if (await emailTaken(pool, body.email)) {
      throw new ConflictError("someone with this email is already a member");
    }
    if (body.agentId) {
      const known = await pool.query("SELECT 1 FROM agents WHERE id = $1", [body.agentId]);
      if (known.rowCount === 0) throw new AppError("unknown agent", 400, "validation_error");
    }
    const invited = await deps.authAdmin.invite(
      body.email,
      body.displayName,
      deps.config.WEB_ORIGIN,
    );
    if (invited.signInLinkFailed) {
      req.log.warn({ memberId: invited.id }, "invited an existing login; sign-in email not sent");
    }
    const user = currentUser(req);
    await inTransaction(pool, async (client) => {
      await insertMember(client, { id: invited.id, ...body });
      await audit(client, user.id, "member_invited", null);
    });
    const member = (await listMembers(pool)).find((m) => m.id === invited.id);
    res.status(201).json(member);
  });

  router.patch("/members/:id", manager, async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateMemberRequestSchema.parse(req.body);
    const user = currentUser(req);
    if (id === user.id && body.disabled === true) {
      throw new ConflictError("you cannot turn off your own account");
    }
    if (body.agentId) {
      const known = await pool.query("SELECT 1 FROM agents WHERE id = $1", [body.agentId]);
      if (known.rowCount === 0) throw new AppError("unknown agent", 400, "validation_error");
    }
    await inTransaction(pool, async (client) => {
      if (!(await updateMember(client, id, body))) throw new NotFoundError("member not found");
      await audit(client, user.id, "member_updated", null);
    });
    res.json((await listMembers(pool)).find((m) => m.id === id));
  });

  return router;
}
