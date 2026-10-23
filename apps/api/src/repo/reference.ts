import { type ModelCallRow, type UsageStore } from "@scc/gateway";
import type { Me, Reference, Rubric, RubricItem, Usage, UsageHistory } from "@scc/shared";

import type { Queryable } from "../db/pool.ts";

// Profiles, reference data, rubric versions, the model cost ledger and the
// audit log.

export async function getProfile(db: Queryable, id: string): Promise<Me | null> {
  const { rows } = await db.query<{
    id: string;
    email: string;
    display_name: string;
    role: Me["role"];
    agent_id: string | null;
  }>(
    // An account a manager turned off counts as having no profile: refused everywhere (ADR-0024).
    "SELECT id, email, display_name, role, agent_id FROM profiles WHERE id = $1 AND disabled_at IS NULL",
    [id],
  );
  const r = rows[0];
  return r
    ? { id: r.id, email: r.email, displayName: r.display_name, role: r.role, agentId: r.agent_id }
    : null;
}

export async function getReference(db: Queryable): Promise<Reference> {
  const [agents, teams, products] = await Promise.all([
    db.query<{ id: string; name: string; team_id: string; external_code: string | null }>(
      "SELECT id, name, team_id, external_code FROM agents ORDER BY name",
    ),
    db.query<{ id: string; name: string }>("SELECT id, name FROM teams ORDER BY name"),
    db.query<{ id: string; name: string }>("SELECT id, name FROM products ORDER BY name"),
  ]);
  return {
    agents: agents.rows.map((a) => ({
      id: a.id,
      name: a.name,
      teamId: a.team_id,
      externalCode: a.external_code,
    })),
    teams: teams.rows,
    products: products.rows,
  };
}

/** referenceExists checks an upload's agent, team and product ids in one query. */
export async function referenceExists(
  db: Queryable,
  agentId: string,
  teamId: string,
  productId: string,
): Promise<boolean> {
  const { rows } = await db.query<{ ok: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM agents WHERE id = $1)
        AND EXISTS (SELECT 1 FROM teams WHERE id = $2)
        AND EXISTS (SELECT 1 FROM products WHERE id = $3) AS ok`,
    [agentId, teamId, productId],
  );
  return rows[0]?.ok ?? false;
}

interface RubricRow {
  id: string;
  version: number;
  name: string;
  items: RubricItem[];
  is_active: boolean;
  created_at: Date;
  product_id: string | null;
}

const RUBRIC_COLUMNS = "id, version, name, items, is_active, created_at, product_id";

const toRubric = (r: RubricRow): Rubric => ({
  id: r.id,
  version: r.version,
  name: r.name,
  items: r.items,
  isActive: r.is_active,
  createdAt: r.created_at.toISOString(),
  productId: r.product_id,
});

/** activeRubric is the default rubric: the one that scores products without their own. */
export async function activeRubric(db: Queryable): Promise<Rubric | null> {
  const { rows } = await db.query<RubricRow>(
    `SELECT ${RUBRIC_COLUMNS} FROM rubrics WHERE is_active AND product_id IS NULL`,
  );
  return rows[0] ? toRubric(rows[0]) : null;
}

/** rubricFor is the rubric that scores a product: its own active one, or the default. */
export async function rubricFor(db: Queryable, productId: string | null): Promise<Rubric | null> {
  const { rows } = await db.query<RubricRow>(
    `SELECT ${RUBRIC_COLUMNS} FROM rubrics
      WHERE is_active AND (product_id = $1 OR product_id IS NULL)
      ORDER BY product_id NULLS LAST LIMIT 1`,
    [productId],
  );
  return rows[0] ? toRubric(rows[0]) : null;
}

/**
 * listRubrics lists versions newest first: every version when product is
 * undefined, the default's when null, or one product's.
 */
export async function listRubrics(db: Queryable, product?: string | null): Promise<Rubric[]> {
  const { rows } = await db.query<RubricRow>(
    product === undefined
      ? `SELECT ${RUBRIC_COLUMNS} FROM rubrics ORDER BY version DESC`
      : `SELECT ${RUBRIC_COLUMNS} FROM rubrics WHERE product_id IS NOT DISTINCT FROM $1 ORDER BY version DESC`,
    product === undefined ? [] : [product],
  );
  return rows.map(toRubric);
}

/** saveRubricVersion adds the next version and makes it the only active one. Run in a transaction. */
export async function saveRubricVersion(
  db: Queryable,
  input: { name: string; items: RubricItem[]; createdBy: string | null; productId?: string | null },
): Promise<Rubric> {
  const productId = input.productId ?? null;
  // Serialise concurrent saves so two managers cannot take the same version number.
  await db.query("LOCK TABLE rubrics IN SHARE ROW EXCLUSIVE MODE");
  await db.query(
    "UPDATE rubrics SET is_active = false WHERE is_active AND product_id IS NOT DISTINCT FROM $1",
    [productId],
  );
  const { rows } = await db.query<RubricRow>(
    `INSERT INTO rubrics (version, name, items, is_active, created_by, product_id)
     SELECT COALESCE(max(version), 0) + 1, $1, $2::jsonb, true, $3, $4 FROM rubrics
     RETURNING ${RUBRIC_COLUMNS}`,
    [input.name, JSON.stringify(input.items), input.createdBy, productId],
  );
  const row = rows[0];
  if (!row) throw new Error("insert into rubrics returned no row");
  return toRubric(row);
}

/** renameProfile sets the caller's display name and returns the profile as /me answers it. */
export async function renameProfile(
  db: Queryable,
  id: string,
  displayName: string,
): Promise<Me | null> {
  const { rowCount } = await db.query(
    "UPDATE profiles SET display_name = $2, updated_at = now() WHERE id = $1 AND disabled_at IS NULL",
    [id, displayName],
  );
  return rowCount === 1 ? getProfile(db, id) : null;
}

export async function audit(
  db: Queryable,
  actorId: string | null,
  action: string,
  callId: string | null,
  batchId: string | null = null,
  apiKeyId: string | null = null,
): Promise<void> {
  await db.query(
    "INSERT INTO audit_events (actor_id, action, call_id, batch_id, api_key_id) VALUES ($1, $2, $3, $4, $5)",
    [actorId, action, callId, batchId, apiKeyId],
  );
}

/** PgUsageStore is the gateway's ledger: one model_calls row per call; the budget is this month's sum. */
export class PgUsageStore implements UsageStore {
  constructor(private readonly db: Queryable) {}

  async monthSpendUsd(now: Date): Promise<number> {
    const { rows } = await this.db.query<{ spent: number }>(
      "SELECT COALESCE(sum(cost_usd), 0) AS spent FROM model_calls WHERE created_at >= date_trunc('month', $1::timestamptz)",
      [now.toISOString()],
    );
    return rows[0]?.spent ?? 0;
  }

  async record(row: ModelCallRow): Promise<string> {
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO model_calls (provider, model, kind, purpose, call_id, status, input_tokens, cached_tokens,
                                output_tokens, audio_seconds, characters, cost_usd, latency_ms, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, LEAST($9, 1000), $10, $11, $12, $13, $14) RETURNING id`,
      [
        row.provider,
        row.model,
        row.kind,
        row.purpose,
        row.callId,
        row.status,
        row.inputTokens,
        row.cachedTokens,
        row.outputTokens,
        row.audioSeconds,
        row.characters,
        row.costUsd,
        row.latencyMs,
        row.error,
      ],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error("insert into model_calls returned no row");
    return id;
  }
}

/** usageHistory is model spend per day and purpose for the last `days` days, oldest first. */
export async function usageHistory(
  db: Queryable,
  days: number,
  now = new Date(),
): Promise<UsageHistory> {
  const { rows } = await db.query<{
    day: string;
    purpose: string;
    calls: number;
    cost: number;
    audio: number;
    chars: number;
    refused: number;
  }>(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, purpose,
            count(*)::int AS calls, COALESCE(sum(cost_usd), 0) AS cost,
            COALESCE(sum(audio_seconds), 0) AS audio, COALESCE(sum(characters), 0)::int AS chars,
            count(*) FILTER (WHERE status = 'refused')::int AS refused
       FROM model_calls
      WHERE created_at >= date_trunc('day', $1::timestamptz - make_interval(days => $2 - 1))
      GROUP BY 1, 2 ORDER BY 1, 2`,
    [now.toISOString(), days],
  );
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  return {
    from,
    to,
    days: rows.map((r) => ({
      day: r.day,
      purpose: r.purpose,
      calls: r.calls,
      costUsd: r.cost,
      audioSeconds: r.audio,
      characters: r.chars,
      refused: r.refused,
    })),
  };
}

export async function usageThisMonth(
  db: Queryable,
  budgetUsd: number,
  now = new Date(),
): Promise<Usage> {
  const { rows } = await db.query<{
    purpose: string;
    calls: number;
    cost: number;
    refused: number;
    month: string;
  }>(
    `SELECT purpose, count(*) AS calls, COALESCE(sum(cost_usd), 0) AS cost,
            count(*) FILTER (WHERE status = 'refused') AS refused,
            to_char(date_trunc('month', $1::timestamptz), 'YYYY-MM-DD') AS month
       FROM model_calls WHERE created_at >= date_trunc('month', $1::timestamptz)
      GROUP BY purpose ORDER BY cost DESC`,
    [now.toISOString()],
  );
  const monthStart = rows[0]?.month ?? `${now.toISOString().slice(0, 7)}-01`;
  return {
    monthStart,
    budgetUsd,
    spentUsd: rows.reduce((s, r) => s + r.cost, 0),
    byPurpose: rows.map((r) => ({
      purpose: r.purpose,
      calls: r.calls,
      costUsd: r.cost,
      refused: r.refused,
    })),
  };
}
