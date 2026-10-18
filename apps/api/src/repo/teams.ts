import type { TeamSettings } from "@scc/shared";

import type { Queryable } from "../db/pool.ts";

// Retention per team (ADR-0023): a team may keep recordings for longer or
// shorter than the default. Changing it moves retention_until on the team's
// recordings that are still stored, counted from the day each was uploaded.

export async function listTeams(db: Queryable, defaultDays: number): Promise<TeamSettings[]> {
  const { rows } = await db.query<{
    id: string;
    name: string;
    audio_retention_days: number | null;
    calls: number;
  }>(
    `SELECT t.id, t.name, t.audio_retention_days,
            (SELECT count(*)::int FROM calls c WHERE c.team_id = t.id AND c.deleted_at IS NULL) AS calls
       FROM teams t ORDER BY t.name`,
  );
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    audioRetentionDays: t.audio_retention_days,
    effectiveRetentionDays: t.audio_retention_days ?? defaultDays,
    calls: t.calls,
  }));
}

/** setTeamRetention saves the team's setting and moves its stored recordings' purge dates. */
export async function setTeamRetention(
  db: Queryable,
  teamId: string,
  days: number | null,
  defaultDays: number,
): Promise<boolean> {
  const { rowCount } = await db.query("UPDATE teams SET audio_retention_days = $2 WHERE id = $1", [
    teamId,
    days,
  ]);
  if (rowCount !== 1) return false;
  await db.query(
    `UPDATE calls SET retention_until = created_at::date + $2::int
      WHERE team_id = $1 AND audio_purged_at IS NULL`,
    [teamId, days ?? defaultDays],
  );
  return true;
}
