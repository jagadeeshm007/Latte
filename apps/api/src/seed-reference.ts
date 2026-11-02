import { DEFAULT_RUBRIC, DEFAULT_RUBRIC_NAME } from "@scc/shared";

import type { Client } from "./db/pool.ts";
import { activeRubric, saveRubricVersion } from "./repo/reference.ts";

// The fictional company both seeds create: the development seed in the real
// schema, the demo seed in the demo schema (ADR-0033). The scripts in
// evals/calls name these agents and products.

export const TEAMS = ["Mumbai Inbound", "Delhi Outbound"];
export const PRODUCTS = ["Suraksha ULIP", "Term Shield", "Health Plus"];
export const AGENTS = [
  { code: "AG001", name: "Ravi Kumar", team: "Mumbai Inbound" },
  { code: "AG002", name: "Anita Sharma", team: "Delhi Outbound" },
  { code: "AG003", name: "Vikram Singh", team: "Mumbai Inbound" },
  { code: "AG004", name: "Neha Gupta", team: "Delhi Outbound" },
];

/**
 * upsertReference creates the teams, products and agents, and the default
 * rubric unless a manager has saved their own. Returns agent ids by code.
 */
export async function upsertReference(
  db: Client,
  out: (line: string) => void,
): Promise<Map<string, string>> {
  for (const name of TEAMS) {
    await db.query("INSERT INTO teams (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [name]);
  }
  for (const name of PRODUCTS) {
    await db.query("INSERT INTO products (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [name]);
  }
  const ids = new Map<string, string>();
  for (const a of AGENTS) {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO agents (team_id, name, external_code)
         SELECT id, $2, $3 FROM teams WHERE name = $1
         ON CONFLICT (external_code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
      [a.team, a.name, a.code],
    );
    if (rows[0]) ids.set(a.code, rows[0].id);
  }
  // A manager's edit always wins; only a seed-owned rubric (no author) is
  // refreshed when the default in packages/shared changes.
  const active = await activeRubric(db);
  const seedOwned = active
    ? (await db.query("SELECT 1 FROM rubrics WHERE id = $1 AND created_by IS NULL", [active.id]))
        .rowCount === 1
    : true;
  if (!active || (seedOwned && JSON.stringify(active.items) !== JSON.stringify(DEFAULT_RUBRIC))) {
    const saved = await saveRubricVersion(db, {
      name: DEFAULT_RUBRIC_NAME,
      items: DEFAULT_RUBRIC,
      createdBy: null,
    });
    out(`rubric: version ${String(saved.version)} created from the default`);
  }
  return ids;
}
