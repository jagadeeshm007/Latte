import type { Status, StatusComponent, StatusNotice } from "@scc/shared";

import type { Queryable } from "../db/pool.ts";
import type { Storage } from "../storage.ts";

// The status page (ADR-0026): each component checked now, its uptime over 90
// days from the checks recorded every five minutes, and notices managers post.

const HISTORY_DAYS = 90;
/** A queued call older than this means processing is stuck or far behind. */
const STUCK_SECONDS = 30 * 60;

export interface Check {
  component: StatusComponent;
  ok: boolean;
  latencyMs: number | null;
  detail: string | null;
}

/** A problem described for the public page; any other error shows only as "not responding". */
class StatusProblem extends Error {}

async function timed(
  component: StatusComponent,
  probe: () => Promise<string | null>,
): Promise<Check> {
  const started = performance.now();
  try {
    const detail = await probe();
    return { component, ok: true, latencyMs: Math.round(performance.now() - started), detail };
  } catch (error) {
    return {
      component,
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      // Raw errors can name hosts and addresses, and this page is public.
      detail: error instanceof StatusProblem ? error.message : "not responding",
    };
  }
}

/** checkComponents probes each component now; none of the probes changes anything. */
export async function checkComponents(deps: {
  pool: Queryable;
  storage: Storage;
}): Promise<Check[]> {
  const { pool, storage } = deps;
  return Promise.all([
    timed("api", () => Promise.resolve(null)),
    timed("database", async () => {
      await pool.query("SELECT 1");
      return null;
    }),
    timed("storage", async () => {
      await storage.exists("status-probe");
      return null;
    }),
    timed("processing", async () => {
      const { rows } = await pool.query<{
        oldest: number | null;
        finished: number;
        failed: number;
      }>(
        `SELECT (SELECT extract(epoch FROM now() - min(updated_at))::int FROM calls
                  WHERE deleted_at IS NULL AND status IN ('uploaded', 'transcribing', 'transcribed', 'scoring')) AS oldest,
                (SELECT count(*)::int FROM calls WHERE status IN ('scored', 'failed')
                    AND updated_at > now() - interval '1 hour') AS finished,
                (SELECT count(*)::int FROM calls WHERE status = 'failed'
                    AND updated_at > now() - interval '1 hour') AS failed`,
      );
      const r = rows[0] ?? { oldest: null, finished: 0, failed: 0 };
      if (r.oldest !== null && r.oldest > STUCK_SECONDS) {
        throw new StatusProblem(
          `the oldest queued call has waited ${String(Math.round(r.oldest / 60))} minutes`,
        );
      }
      if (r.finished >= 4 && r.failed / r.finished >= 0.5) {
        throw new StatusProblem(
          `${String(r.failed)} of ${String(r.finished)} calls failed in the last hour`,
        );
      }
      return r.oldest === null
        ? "nothing queued"
        : `oldest queued call waited ${String(Math.round(r.oldest / 60))} min`;
    }),
    timed("models", async () => {
      const { rows } = await pool.query<{ total: number; errors: number }>(
        `SELECT count(*)::int AS total, (count(*) FILTER (WHERE status = 'error'))::int AS errors
           FROM model_calls WHERE created_at > now() - interval '1 hour'`,
      );
      const r = rows[0] ?? { total: 0, errors: 0 };
      if (r.total >= 5 && r.errors / r.total >= 0.3) {
        throw new StatusProblem(
          `${String(r.errors)} of ${String(r.total)} model calls failed in the last hour`,
        );
      }
      return `${String(r.total)} model calls in the last hour`;
    }),
  ]);
}

export async function recordChecks(db: Queryable, checks: Check[]): Promise<void> {
  await db.query(
    `INSERT INTO status_checks (component, ok, latency_ms, detail)
     SELECT * FROM unnest($1::text[], $2::boolean[], $3::int[], $4::text[])`,
    [
      checks.map((c) => c.component),
      checks.map((c) => c.ok),
      checks.map((c) => c.latencyMs),
      checks.map((c) => c.detail),
    ],
  );
  await db.query(
    `DELETE FROM status_checks WHERE checked_at < now() - make_interval(days => ${String(HISTORY_DAYS)})`,
  );
}

/** history: per component, the share of passing checks for each of the last 90 days. */
async function history(db: Queryable, today: Date) {
  const { rows } = await db.query<{ component: StatusComponent; day: string; uptime: number }>(
    `SELECT component, to_char(checked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, avg(ok::int) AS uptime
       FROM status_checks WHERE checked_at > now() - make_interval(days => $1) GROUP BY 1, 2`,
    [HISTORY_DAYS],
  );
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) =>
    new Date(today.getTime() - (HISTORY_DAYS - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
  return (component: StatusComponent) =>
    days.map((day) => {
      const hit = rows.find((r) => r.component === component && r.day === day);
      return { day, uptime: hit ? Math.round(hit.uptime * 1000) / 1000 : null };
    });
}

export async function listNotices(db: Queryable): Promise<StatusNotice[]> {
  const { rows } = await db.query<{
    id: string;
    title: string;
    body: string;
    severity: StatusNotice["severity"];
    started_at: Date;
    resolved_at: Date | null;
  }>(
    `SELECT id, title, body, severity, started_at, resolved_at FROM status_notices
      WHERE resolved_at IS NULL OR resolved_at > now() - interval '7 days'
      ORDER BY (resolved_at IS NULL) DESC, started_at DESC LIMIT 20`,
  );
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    severity: n.severity,
    startedAt: n.started_at.toISOString(),
    resolvedAt: n.resolved_at?.toISOString() ?? null,
  }));
}

export async function status(
  deps: { pool: Queryable; storage: Storage },
  now = new Date(),
): Promise<Status> {
  const [checks, historyOf, notices] = await Promise.all([
    checkComponents(deps),
    history(deps.pool, now),
    listNotices(deps.pool),
  ]);
  const open = notices.filter((n) => n.resolvedAt === null);
  const overall =
    open.some((n) => n.severity === "outage") || !checks.find((c) => c.component === "database")?.ok
      ? "outage"
      : checks.some((c) => !c.ok) || open.some((n) => n.severity === "degraded")
        ? "degraded"
        : "operational";
  return {
    overall,
    checkedAt: now.toISOString(),
    components: checks.map((c) => ({ ...c, history: historyOf(c.component) })),
    notices,
  };
}

export async function postNotice(
  db: Queryable,
  n: { title: string; body: string; severity: StatusNotice["severity"] },
  by: string,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO status_notices (title, body, severity, created_by) VALUES ($1, $2, $3, $4) RETURNING id",
    [n.title, n.body, n.severity, by],
  );
  const row = rows[0];
  if (!row) throw new Error("insert into status_notices returned no row");
  return row.id;
}

export async function resolveNotice(db: Queryable, id: string): Promise<boolean> {
  const { rowCount } = await db.query(
    "UPDATE status_notices SET resolved_at = now() WHERE id = $1 AND resolved_at IS NULL",
    [id],
  );
  return rowCount === 1;
}
