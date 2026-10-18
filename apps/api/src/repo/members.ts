import type { Member, Role } from "@scc/shared";

import type { Queryable } from "../db/pool.ts";
import { ConflictError } from "../errors.ts";

// Members (ADR-0024): who may use Latte, with which role. Changes keep at
// least one active manager, so the workspace can never lock itself out.

export async function listMembers(db: Queryable): Promise<Member[]> {
  const { rows } = await db.query<{
    id: string;
    email: string;
    display_name: string;
    role: Role;
    agent_id: string | null;
    agent_name: string | null;
    disabled_at: Date | null;
    created_at: Date;
  }>(
    `SELECT p.id, p.email, p.display_name, p.role, p.agent_id, a.name AS agent_name,
            p.disabled_at, p.created_at
       FROM profiles p LEFT JOIN agents a ON a.id = p.agent_id
      ORDER BY (p.disabled_at IS NOT NULL), lower(p.display_name), p.id`,
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    role: r.role,
    agentId: r.agent_id,
    agentName: r.agent_name,
    disabledAt: r.disabled_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function insertMember(
  db: Queryable,
  m: { id: string; email: string; displayName: string; role: Role; agentId: string | null },
): Promise<void> {
  await db.query(
    "INSERT INTO profiles (id, email, display_name, role, agent_id) VALUES ($1, $2, $3, $4, $5)",
    [m.id, m.email, m.displayName, m.role, m.agentId],
  );
}

/** emailTaken: whether a profile already uses the email, compared without case. */
export async function emailTaken(db: Queryable, email: string): Promise<boolean> {
  const { rowCount } = await db.query("SELECT 1 FROM profiles WHERE lower(email) = lower($1)", [
    email,
  ]);
  return (rowCount ?? 0) > 0;
}

/**
 * updateMember changes a role, agent link or on/off state. It locks the
 * managers first and refuses a change that would leave no active manager.
 * Run in a transaction. Null when there is no such member.
 */
export async function updateMember(
  db: Queryable,
  id: string,
  patch: {
    role?: Role | undefined;
    agentId?: string | null | undefined;
    disabled?: boolean | undefined;
  },
): Promise<"updated" | null> {
  const managers = await db.query<{ id: string }>(
    "SELECT id FROM profiles WHERE role = 'manager' AND disabled_at IS NULL FOR UPDATE",
  );
  const current = await db.query<{ role: Role; agent_id: string | null; disabled_at: Date | null }>(
    "SELECT role, agent_id, disabled_at FROM profiles WHERE id = $1 FOR UPDATE",
    [id],
  );
  const row = current.rows[0];
  if (!row) return null;
  const role = patch.role ?? row.role;
  const agentId = role === "agent" ? (patch.agentId ?? row.agent_id) : null;
  if (role === "agent" && !agentId) {
    throw new ConflictError("an agent account needs a linked agent record");
  }
  const disabled = patch.disabled ?? row.disabled_at !== null;
  const stillManager = role === "manager" && !disabled;
  const wasActiveManager = managers.rows.some((m) => m.id === id);
  if (wasActiveManager && !stillManager && managers.rows.length === 1) {
    throw new ConflictError("Latte needs at least one active manager");
  }
  await db.query(
    `UPDATE profiles
        SET role = $2, agent_id = $3, updated_at = now(),
            disabled_at = CASE WHEN $4 THEN coalesce(disabled_at, now()) ELSE NULL END
      WHERE id = $1`,
    [id, role, agentId, disabled],
  );
  return "updated";
}
