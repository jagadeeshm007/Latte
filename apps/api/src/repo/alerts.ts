import type { AlertFiring, AlertMetric, AlertRule } from "@scc/shared";

import { GROUPS, NOT_PASSED, NOT_REJECTED } from "./analytics.ts";
import type { Queryable } from "../db/pool.ts";

// Alert rules (ADR-0025): a metric per team, product or agent, compared over
// a recent window with the baseline period just before it. A rise in flag or
// fail rate, or a fall in average score, by at least the threshold fires.

interface RuleRow {
  id: string;
  name: string;
  metric: AlertMetric;
  scope: "team" | "product" | "agent";
  item_key: string | null;
  threshold_points: number;
  window_days: number;
  baseline_days: number;
  min_calls: number;
  cooldown_hours: number;
  enabled: boolean;
  created_at: Date;
  last_evaluated_at: Date | null;
  firings_30d: number;
}

const toRule = (r: RuleRow): AlertRule => ({
  id: r.id,
  name: r.name,
  metric: r.metric,
  scope: r.scope,
  itemKey: r.item_key,
  thresholdPoints: r.threshold_points,
  windowDays: r.window_days,
  baselineDays: r.baseline_days,
  minCalls: r.min_calls,
  cooldownHours: r.cooldown_hours,
  enabled: r.enabled,
  createdAt: r.created_at.toISOString(),
  lastEvaluatedAt: r.last_evaluated_at?.toISOString() ?? null,
  firings30d: r.firings_30d,
});

const RULE_SELECT = `
  SELECT r.*, (SELECT count(*)::int FROM alert_firings f
                WHERE f.rule_id = r.id AND f.fired_at > now() - interval '30 days') AS firings_30d
    FROM alert_rules r`;

export interface RuleInput {
  name: string;
  metric: AlertMetric;
  scope: "team" | "product" | "agent";
  itemKey: string | null;
  thresholdPoints: number;
  windowDays: number;
  baselineDays: number;
  minCalls: number;
  cooldownHours: number;
  enabled: boolean;
}

export async function listRules(db: Queryable): Promise<AlertRule[]> {
  const { rows } = await db.query<RuleRow>(`${RULE_SELECT} ORDER BY r.created_at DESC, r.id`);
  return rows.map(toRule);
}

export async function getRule(db: Queryable, id: string): Promise<AlertRule | null> {
  const { rows } = await db.query<RuleRow>(`${RULE_SELECT} WHERE r.id = $1`, [id]);
  return rows[0] ? toRule(rows[0]) : null;
}

const VALUES = (r: RuleInput) => [
  r.name,
  r.metric,
  r.scope,
  r.itemKey,
  r.thresholdPoints,
  r.windowDays,
  r.baselineDays,
  r.minCalls,
  r.cooldownHours,
  r.enabled,
];

export async function insertRule(db: Queryable, r: RuleInput, createdBy: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO alert_rules (name, metric, scope, item_key, threshold_points, window_days, baseline_days,
                              min_calls, cooldown_hours, enabled, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [...VALUES(r), createdBy],
  );
  const row = rows[0];
  if (!row) throw new Error("insert into alert_rules returned no row");
  return row.id;
}

export async function replaceRule(db: Queryable, id: string, r: RuleInput): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE alert_rules SET name = $1, metric = $2, scope = $3, item_key = $4, threshold_points = $5,
            window_days = $6, baseline_days = $7, min_calls = $8, cooldown_hours = $9, enabled = $10
      WHERE id = $11`,
    [...VALUES(r), id],
  );
  return rowCount === 1;
}

export async function deleteRule(db: Queryable, id: string): Promise<boolean> {
  const { rowCount } = await db.query("DELETE FROM alert_rules WHERE id = $1", [id]);
  return rowCount === 1;
}

export async function listFirings(
  db: Queryable,
  ruleId: string | null,
  limit = 50,
): Promise<AlertFiring[]> {
  const { rows } = await db.query<{
    id: string;
    rule_id: string;
    rule_name: string;
    group_id: string;
    group_name: string;
    value: number;
    baseline: number;
    calls: number;
    fired_at: Date;
  }>(
    `SELECT f.*, r.name AS rule_name FROM alert_firings f JOIN alert_rules r ON r.id = f.rule_id
      WHERE ($1::uuid IS NULL OR f.rule_id = $1::uuid)
      ORDER BY f.fired_at DESC, f.id LIMIT $2`,
    [ruleId, limit],
  );
  return rows.map((f) => ({
    id: f.id,
    ruleId: f.rule_id,
    ruleName: f.rule_name,
    groupId: f.group_id,
    groupName: f.group_name,
    value: f.value,
    baseline: f.baseline,
    calls: f.calls,
    firedAt: f.fired_at.toISOString(),
  }));
}

export interface Measured {
  groupId: string;
  groupName: string;
  calls: number;
  value: number | null;
  baseline: number | null;
}

/**
 * measure computes the rule's metric per group over the window (the last
 * windowDays up to `to`) and the baseline (the baselineDays before it), in
 * points: rates times 100, scores as they are.
 */
export async function measure(db: Queryable, rule: AlertRule, to: string): Promise<Measured[]> {
  const { col, table } = GROUPS[rule.scope];
  const params = [to, rule.windowDays, rule.baselineDays];
  const range = `c.call_date > $1::date - ($2::int + $3::int) AND c.call_date <= $1::date`;
  const inWindow = `c.call_date > $1::date - $2::int`;
  const perCall =
    rule.metric === "item_fail_rate"
      ? `SELECT c.${col}::text AS gid, ${inWindow} AS w,
                (bool_or(x.status IN ${NOT_PASSED}))::int * 100.0 AS v
           FROM calls c JOIN findings x ON x.call_id = c.id
          WHERE c.deleted_at IS NULL AND ${range} AND x.item_key = $4 AND ${NOT_REJECTED}
          GROUP BY c.id, 1, 2
         HAVING NOT bool_and(x.status = 'not_applicable')`
      : `SELECT c.${col}::text AS gid, ${inWindow} AS w,
                ${rule.metric === "flag_rate" ? "s.needs_review::int * 100.0" : "s.overall_score"} AS v
           FROM calls c JOIN scores s ON s.call_id = c.id
          WHERE c.deleted_at IS NULL AND ${range}
            ${rule.metric === "avg_score" ? "AND s.overall_score IS NOT NULL" : ""}`;
  const { rows } = await db.query<{
    gid: string;
    name: string;
    calls: number;
    value: number | null;
    baseline: number | null;
  }>(
    `WITH per_call AS (${perCall})
     SELECT p.gid, g.name,
            (count(*) FILTER (WHERE p.w))::int AS calls,
            avg(p.v) FILTER (WHERE p.w) AS value,
            avg(p.v) FILTER (WHERE NOT p.w) AS baseline
       FROM per_call p JOIN ${table} g ON g.id::text = p.gid
      GROUP BY p.gid, g.name`,
    rule.metric === "item_fail_rate" ? [...params, rule.itemKey] : params,
  );
  return rows.map((r) => ({
    groupId: r.gid,
    groupName: r.name,
    calls: r.calls,
    value: r.value === null ? null : Math.round(r.value * 100) / 100,
    baseline: r.baseline === null ? null : Math.round(r.baseline * 100) / 100,
  }));
}

/** breaches: the groups whose change is bad and at least the threshold, with enough calls. */
export function breaches(rule: AlertRule, measured: Measured[]): Measured[] {
  // A score that falls is bad news; a flag or fail rate that rises is.
  const worse = rule.metric === "avg_score" ? -1 : 1;
  return measured.filter(
    (m) =>
      m.calls >= rule.minCalls &&
      m.value !== null &&
      m.baseline !== null &&
      (m.value - m.baseline) * worse >= rule.thresholdPoints,
  );
}

/** inCooldown: whether this rule already fired for the group within its cooldown. */
export async function inCooldown(
  db: Queryable,
  rule: AlertRule,
  groupId: string,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `SELECT 1 FROM alert_firings
      WHERE rule_id = $1 AND group_id = $2 AND fired_at > now() - make_interval(hours => $3)`,
    [rule.id, groupId, rule.cooldownHours],
  );
  return (rowCount ?? 0) > 0;
}

export async function recordFiring(db: Queryable, rule: AlertRule, m: Measured): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO alert_firings (rule_id, group_id, group_name, value, baseline, calls)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [rule.id, m.groupId, m.groupName, m.value, m.baseline, m.calls],
  );
  const row = rows[0];
  if (!row) throw new Error("insert into alert_firings returned no row");
  return row.id;
}

export async function markEvaluated(db: Queryable, ruleId: string): Promise<void> {
  await db.query("UPDATE alert_rules SET last_evaluated_at = now() WHERE id = $1", [ruleId]);
}

/** managers: who receives alerts. */
export async function managerIds(db: Queryable): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>("SELECT id FROM profiles WHERE role = 'manager'");
  return rows.map((r) => r.id);
}
