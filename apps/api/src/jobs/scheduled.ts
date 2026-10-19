import type { Logger } from "pino";

import { inTransaction, type Pool } from "../db/pool.ts";
import * as alerts from "../repo/alerts.ts";
import { dueDigests, markDigestSent, notify } from "../repo/inbox.ts";
import { highlights } from "../repo/performance.ts";
import { activeRubric } from "../repo/reference.ts";
import { checkComponents, recordChecks } from "../repo/status.ts";
import { emitEvent } from "../repo/webhooks.ts";
import type { Storage } from "../storage.ts";

// The scheduled jobs behind alerts and digests (ADR-0025): run hourly by the
// local worker and by Vercel Cron. Both write to the in-app inbox and the
// webhook outbox in one transaction per firing or digest, so neither is lost
// nor sent twice.

interface ScheduledDeps {
  pool: Pool;
  log: Logger;
}

const METRIC_WORDS = {
  flag_rate: { name: "flag rate", unit: "%" },
  avg_score: { name: "average score", unit: "%" },
  item_fail_rate: { name: "fail rate", unit: "%" },
} as const;

const today = (now: Date) => now.toISOString().slice(0, 10);

/** evaluateAlerts checks every live rule and fires where a group moved past its threshold. */
export async function evaluateAlerts(deps: ScheduledDeps, now = new Date()): Promise<number> {
  const rules = (await alerts.listRules(deps.pool)).filter((r) => r.enabled);
  const managers = await alerts.managerIds(deps.pool);
  let fired = 0;
  for (const rule of rules) {
    const measured = await alerts.measure(deps.pool, rule, today(now));
    for (const m of alerts.breaches(rule, measured)) {
      const sent = await inTransaction(deps.pool, async (db) => {
        if (await alerts.inCooldown(db, rule, m.groupId)) return false;
        const firingId = await alerts.recordFiring(db, rule, m);
        const words = METRIC_WORDS[rule.metric];
        const what = rule.itemKey ? `${words.name} on ${rule.itemKey}` : words.name;
        await notify(db, managers, {
          kind: "alert",
          title: `${rule.name}: ${m.groupName}`,
          body: `${m.groupName}'s ${what} is ${String(m.value)}${words.unit} over the last ${String(rule.windowDays)} days, against ${String(m.baseline)}${words.unit} before (${String(m.calls)} calls).`,
          link: rule.scope === "agent" ? `/agents/${m.groupId}` : `/performance?by=${rule.scope}`,
          data: { ruleId: rule.id, firingId, groupId: m.groupId },
        });
        await emitEvent(db, "alert.triggered", {
          ruleId: rule.id,
          ruleName: rule.name,
          metric: rule.metric,
          scope: rule.scope,
          itemKey: rule.itemKey,
          groupId: m.groupId,
          groupName: m.groupName,
          value: m.value,
          baseline: m.baseline,
          calls: m.calls,
        });
        return true;
      });
      if (sent) fired++;
    }
    await alerts.markEvaluated(deps.pool, rule.id);
  }
  deps.log.info({ rules: rules.length, fired }, "alerts evaluated");
  return fired;
}

/** sendDigests writes each due subscriber's digest to their inbox, and one digest.ready per period. */
export async function sendDigests(deps: ScheduledDeps, now = new Date()): Promise<number> {
  const rubric = await activeRubric(deps.pool);
  return inTransaction(deps.pool, async (db) => {
    const due = await dueDigests(db);
    const announced = new Set<string>();
    for (const sub of due) {
      const days = sub.frequency === "daily" ? 1 : 7;
      const to = today(now);
      const from = new Date(now.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
      const h = await highlights(db, rubric?.items ?? [], { from, to }, now);
      const top = h.topAgents[0]?.name;
      const coach = h.bottomAgents[0]?.name;
      const summary = [
        `${String(h.kpis.callsScored.value ?? 0)} calls scored`,
        h.kpis.avgScore.value === null ? null : `average ${String(h.kpis.avgScore.value)}%`,
        `${String(h.kpis.breaches.value ?? 0)} breaches`,
        `${String(h.kpis.reviewBacklog)} waiting for QA`,
        top ? `top performer ${top}` : null,
        coach ? `needs coaching ${coach}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      await notify(db, [sub.profile_id], {
        kind: "digest",
        title: sub.frequency === "daily" ? "Your daily digest" : "Your weekly digest",
        body: `${from} to ${to}: ${summary}.`,
        link: "/dashboard",
        data: { from, to, kpis: h.kpis },
      });
      if (!announced.has(sub.frequency)) {
        announced.add(sub.frequency);
        await emitEvent(db, "digest.ready", { frequency: sub.frequency, from, to, kpis: h.kpis });
      }
      await markDigestSent(db, sub.profile_id);
    }
    deps.log.info({ sent: due.length }, "digests sent");
    return due.length;
  });
}

/** recordStatus checks every component and keeps the result for the status page's uptime history. */
export async function recordStatus(deps: ScheduledDeps & { storage: Storage }): Promise<void> {
  const checks = await checkComponents(deps);
  await recordChecks(deps.pool, checks);
  const down = checks.filter((c) => !c.ok).map((c) => c.component);
  if (down.length > 0) deps.log.warn({ down }, "status check found components down");
}
