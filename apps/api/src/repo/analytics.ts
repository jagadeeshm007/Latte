import type { Agreement, Dashboard, RubricItem, Scorecard } from "@scc/shared";

import { listCalls } from "./calls.ts";
import type { Queryable } from "../db/pool.ts";

// Read models for the scorecard, judge agreement and the manager dashboard.
// Findings a QA reviewer disagreed with never count against an agent (Q-011).

const NOT_REJECTED = `NOT EXISTS (SELECT 1 FROM finding_reviews r WHERE r.finding_id = x.id AND r.decision = 'disagree')`;

export const COACHING_WINDOW_DAYS = 90;

export async function scorecard(
  db: Queryable,
  agentId: string,
  rubric: RubricItem[],
): Promise<Scorecard | null> {
  const agent = await db.query<{ id: string; name: string; team_name: string }>(
    "SELECT a.id, a.name, t.name AS team_name FROM agents a JOIN teams t ON t.id = a.team_id WHERE a.id = $1",
    [agentId],
  );
  const a = agent.rows[0];
  if (!a) return null;

  const totals = await db.query<{
    calls: number;
    avg_overall: number | null;
    avg_talk: number | null;
  }>(
    `SELECT count(*) AS calls, avg(s.overall_score) AS avg_overall, avg(s.talk_ratio) AS avg_talk
       FROM scores s JOIN calls c ON c.id = s.call_id
      WHERE c.agent_id = $1 AND s.judge_status = 'ok'`,
    [agentId],
  );

  const perItem = await db.query<{
    item_key: string;
    applicable: number;
    passed: number;
    misses: number;
  }>(
    `WITH f AS (
       SELECT x.call_id, x.item_key,
              bool_or(x.status IN ('missed', 'breach')) AS bad,
              bool_and(x.status = 'not_applicable') AS na
         FROM findings x JOIN calls c ON c.id = x.call_id
        WHERE c.agent_id = $1 AND c.created_at > now() - make_interval(days => $2) AND ${NOT_REJECTED}
        GROUP BY x.call_id, x.item_key)
     SELECT item_key,
            count(*) FILTER (WHERE NOT na) AS applicable,
            count(*) FILTER (WHERE NOT na AND NOT bad) AS passed,
            count(*) FILTER (WHERE bad) AS misses
       FROM f GROUP BY item_key`,
    [agentId, COACHING_WINDOW_DAYS],
  );
  const stats = new Map(perItem.rows.map((r) => [r.item_key, r]));

  const items = rubric.map((i) => {
    const s = stats.get(i.key);
    const applicable = s?.applicable ?? 0;
    const passed = s?.passed ?? 0;
    return {
      key: i.key,
      label: i.label,
      type: i.type,
      applicable,
      passed,
      passRate: applicable ? Math.round((passed / applicable) * 1000) / 1000 : null,
    };
  });

  const top = rubric
    .map((i) => ({ item: i, misses: stats.get(i.key)?.misses ?? 0 }))
    .filter((x) => x.misses > 0)
    .sort((x, y) => y.misses - x.misses || (x.item.type === "prohibited" ? -1 : 1))
    .slice(0, 3);

  const coaching = await Promise.all(
    top.map(async ({ item, misses }) => {
      const ex = await db.query<{ call_id: string; rationale: string | null }>(
        `SELECT DISTINCT ON (x.call_id) x.call_id, x.rationale, c.created_at
           FROM findings x JOIN calls c ON c.id = x.call_id
          WHERE c.agent_id = $1 AND x.item_key = $2 AND x.status IN ('missed', 'breach') AND ${NOT_REJECTED}
          ORDER BY x.call_id, c.created_at DESC LIMIT 3`,
        [agentId, item.key],
      );
      return {
        key: item.key,
        label: item.label,
        misses,
        examples: ex.rows.map((r) => ({ callId: r.call_id, note: r.rationale })),
      };
    }),
  );

  const recent = await listCalls(db, { agentId }, { limit: 10 });
  const t = totals.rows[0];
  const round = (v: number | null | undefined, places: number) =>
    v === null || v === undefined ? null : Math.round(v * 10 ** places) / 10 ** places;
  return {
    agent: { id: a.id, name: a.name, teamName: a.team_name },
    callsScored: t?.calls ?? 0,
    avgOverall: round(t?.avg_overall, 1),
    avgTalkRatio: round(t?.avg_talk, 3),
    prohibitedCount: rubric
      .filter((i) => i.type === "prohibited")
      .reduce((s, i) => s + (stats.get(i.key)?.misses ?? 0), 0),
    items,
    coaching,
    recentCalls: recent.items,
  };
}

/**
 * Judge-to-human agreement per rubric item (US-01-007). A reviewer-added finding is a judge miss and
 * replaces the judge's own verdict on that item for that call, so it is not also counted as agreed.
 */
export async function agreement(db: Queryable, rubric: RubricItem[]): Promise<Agreement> {
  const { rows } = await db.query<{
    item_key: string;
    agreed: number;
    disagreed: number;
    misses: number;
  }>(
    `SELECT x.item_key,
            count(*) FILTER (WHERE x.source = 'llm' AND r.decision = 'agree' AND NOT EXISTS (SELECT 1 FROM findings m WHERE m.call_id = x.call_id AND m.item_key = x.item_key AND m.source = 'reviewer')) AS agreed,
            count(*) FILTER (WHERE x.source = 'llm' AND r.decision = 'disagree' AND NOT EXISTS (SELECT 1 FROM findings m WHERE m.call_id = x.call_id AND m.item_key = x.item_key AND m.source = 'reviewer')) AS disagreed,
            count(*) FILTER (WHERE x.source = 'reviewer') AS misses
       FROM findings x LEFT JOIN finding_reviews r ON r.finding_id = x.id
      GROUP BY x.item_key`,
  );
  const byKey = new Map(rows.map((r) => [r.item_key, r]));
  return {
    items: rubric.map((i) => {
      const r = byKey.get(i.key);
      const agreed = r?.agreed ?? 0;
      const disagreed = r?.disagreed ?? 0;
      const judgeMisses = r?.misses ?? 0;
      const total = agreed + disagreed + judgeMisses;
      return {
        key: i.key,
        label: i.label,
        type: i.type,
        agreed,
        disagreed,
        judgeMisses,
        rate: total ? Math.round((agreed / total) * 1000) / 1000 : null,
      };
    }),
  };
}

export async function dashboard(
  db: Queryable,
  rubric: RubricItem[],
  q: { groupBy: "team" | "product"; from?: string | undefined; to?: string | undefined },
): Promise<Dashboard> {
  const col = q.groupBy === "team" ? "team_id" : "product_id";
  const table = q.groupBy === "team" ? "teams" : "products";
  const params: unknown[] = [q.from ?? "1900-01-01", q.to ?? "2999-12-31"];
  const groups = await db.query<{
    id: string;
    name: string;
    scored: number;
    flagged: number;
    avg_overall: number | null;
  }>(
    `SELECT g.id, g.name,
            count(s.id) AS scored,
            count(s.id) FILTER (WHERE s.needs_review) AS flagged,
            avg(s.overall_score) AS avg_overall
       FROM ${table} g
       LEFT JOIN calls c ON c.${col} = g.id AND c.call_date BETWEEN $1::date AND $2::date
       LEFT JOIN scores s ON s.call_id = c.id
      GROUP BY g.id, g.name ORDER BY g.name`,
    params,
  );
  const items = await db.query<{
    group_id: string;
    item_key: string;
    applicable: number;
    passed: number;
  }>(
    `SELECT c.${col} AS group_id, x.item_key,
            count(*) FILTER (WHERE x.status <> 'not_applicable') AS applicable,
            count(*) FILTER (WHERE x.status IN ('met', 'clear')) AS passed
       FROM findings x JOIN calls c ON c.id = x.call_id
      WHERE x.source = 'llm' AND c.call_date BETWEEN $1::date AND $2::date AND ${NOT_REJECTED}
      GROUP BY 1, 2`,
    params,
  );
  const keyed = new Map(items.rows.map((r) => [`${r.group_id}:${r.item_key}`, r]));
  return {
    groupBy: q.groupBy,
    groups: groups.rows.map((g) => ({
      id: g.id,
      name: g.name,
      callsScored: g.scored,
      flagged: g.flagged,
      flagRate: g.scored ? Math.round((g.flagged / g.scored) * 1000) / 1000 : null,
      avgOverall: g.avg_overall === null ? null : Math.round(g.avg_overall * 10) / 10,
      items: rubric.map((i) => {
        const r = keyed.get(`${g.id}:${i.key}`);
        return {
          key: i.key,
          passRate: r?.applicable ? Math.round((r.passed / r.applicable) * 1000) / 1000 : null,
        };
      }),
    })),
  };
}
