import type {
  Highlights,
  Leaderboard,
  LeaderboardQuery,
  LeaderboardSort,
  LeaderRow,
  RubricItem,
} from "@scc/shared";

import { GROUPS, NOT_PASSED, NOT_REJECTED } from "./analytics.ts";
import { likePattern } from "./sql.ts";
import type { Queryable } from "../db/pool.ts";

// The manager's view at scale: a paged, sorted leaderboard of any grouping,
// and the period's highlights. Hundreds of teams and agents never reach the
// browser at once; the dashboard shows the few worth acting on.

/** Fixed ORDER BY columns; the query string only ever picks a key. */
const SORTS: Record<LeaderboardSort, string> = {
  name: "name",
  calls: "scored",
  avgScore: "avg_overall",
  flagRate: "flag_rate",
  breaches: "breaches",
};

const ALL_TIME = { from: "1900-01-01", to: "2999-12-31" };
/** Agents and teams need this many scored calls before they are ranked in the highlights. */
const RANKED_MIN_CALLS = 3;
const HIGHLIGHT_SIZE = 5;
const MIX_SIZE = 6;

const rate = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 1000 : null;
const oneDecimal = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

/** statsSql: one row per group with its scored calls, flags and breaches in the date range. */
function statsSql(groupBy: LeaderboardQuery["groupBy"]): string {
  const { col, table } = GROUPS[groupBy];
  return `WITH stats AS (
    SELECT g.id::text AS id, g.name,
           count(s.id)::int AS scored,
           (count(s.id) FILTER (WHERE s.needs_review))::int AS flagged,
           avg(s.overall_score) AS avg_overall,
           (count(s.id) FILTER (WHERE s.needs_review))::numeric / NULLIF(count(s.id), 0) AS flag_rate,
           coalesce(sum(b.n) FILTER (WHERE s.id IS NOT NULL), 0)::int AS breaches
      FROM ${table} g
      LEFT JOIN calls c ON c.${col} = g.id AND c.deleted_at IS NULL
                       AND c.call_date BETWEEN $1::date AND $2::date
      LEFT JOIN scores s ON s.call_id = c.id
      LEFT JOIN LATERAL (
        SELECT count(*) AS n FROM findings x
         WHERE x.call_id = c.id AND x.status = 'breach' AND ${NOT_REJECTED}) b ON true
     GROUP BY g.id, g.name)`;
}

/** leaderboard ranks one grouping: filtered, sorted and paged in SQL, with a total. */
export async function leaderboard(
  db: Queryable,
  rubric: RubricItem[],
  q: Omit<LeaderboardQuery, "q"> & { q?: string | undefined },
): Promise<Leaderboard> {
  const params: unknown[] = [q.from ?? ALL_TIME.from, q.to ?? ALL_TIME.to, q.minCalls];
  let where = "scored >= $3";
  if (q.q) {
    params.push(likePattern(q.q));
    where += ` AND name ILIKE $${String(params.length)}`;
  }
  const stats = statsSql(q.groupBy);
  const dir = q.dir === "asc" ? "ASC" : "DESC";
  const pageParams = [...params, q.limit, (q.page - 1) * q.limit];
  const [rows, count] = await Promise.all([
    db.query<{
      id: string;
      name: string;
      scored: number;
      flagged: number;
      avg_overall: number | null;
      breaches: number;
    }>(
      `${stats}
       SELECT id, name, scored, flagged, avg_overall, breaches FROM stats
        WHERE ${where}
        ORDER BY ${SORTS[q.sort]} ${dir} NULLS LAST, name ASC, id ASC
        LIMIT $${String(pageParams.length - 1)} OFFSET $${String(pageParams.length)}`,
      pageParams,
    ),
    db.query<{ total: number }>(
      `${stats} SELECT count(*)::int AS total FROM stats WHERE ${where}`,
      params,
    ),
  ]);
  const passRates = await itemPassRates(
    db,
    q.groupBy,
    rows.rows.map((r) => r.id),
    params.slice(0, 2),
  );
  return {
    groupBy: q.groupBy,
    total: count.rows[0]?.total ?? 0,
    items: rows.rows.map((r): LeaderRow => ({
      id: r.id,
      name: r.name,
      callsScored: r.scored,
      flagged: r.flagged,
      flagRate: rate(r.flagged, r.scored),
      avgOverall: oneDecimal(r.avg_overall),
      breaches: r.breaches,
      items: rubric.map((i) => {
        const p = passRates.get(`${r.id}:${i.key}`);
        return { key: i.key, passRate: p ? rate(p.passed, p.applicable) : null };
      }),
    })),
  };
}

/** itemPassRates: per group on this page and rubric item, the calls it applied to and passed. */
async function itemPassRates(
  db: Queryable,
  groupBy: LeaderboardQuery["groupBy"],
  ids: string[],
  range: unknown[],
) {
  if (ids.length === 0) return new Map<string, { applicable: number; passed: number }>();
  const { col } = GROUPS[groupBy];
  const { rows } = await db.query<{
    group_id: string;
    item_key: string;
    applicable: number;
    passed: number;
  }>(
    `WITH f AS (
       SELECT c.${col}::text AS group_id, x.call_id, x.item_key,
              bool_or(x.status IN ${NOT_PASSED}) AS bad,
              bool_and(x.status = 'not_applicable') AS na
         FROM findings x JOIN calls c ON c.id = x.call_id AND c.deleted_at IS NULL
        WHERE c.call_date BETWEEN $1::date AND $2::date
          AND c.${col}::text = ANY($3::text[]) AND ${NOT_REJECTED}
        GROUP BY 1, 2, 3)
     SELECT group_id, item_key,
            (count(*) FILTER (WHERE NOT na))::int AS applicable,
            (count(*) FILTER (WHERE NOT na AND NOT bad))::int AS passed
       FROM f GROUP BY 1, 2`,
    [...range, ids],
  );
  return new Map(rows.map((r) => [`${r.group_id}:${r.item_key}`, r]));
}

/** addDays moves an ISO date (YYYY-MM-DD) by whole days, in UTC. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** periodRange: the asked range (default the last 30 days) and the equal range before it. */
export function periodRange(
  q: { from?: string | undefined; to?: string | undefined },
  today: Date,
) {
  const to = q.to ?? today.toISOString().slice(0, 10);
  const from = q.from ?? addDays(to, -29);
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  const previousTo = addDays(from, -1);
  return { from, to, previousFrom: addDays(previousTo, 1 - days), previousTo };
}

async function periodKpis(db: Queryable, from: string, to: string) {
  const { rows } = await db.query<{
    scored: number;
    avg: number | null;
    flagged: number;
    breaches: number;
  }>(
    `SELECT count(s.id)::int AS scored, avg(s.overall_score) AS avg,
            (count(s.id) FILTER (WHERE s.needs_review))::int AS flagged,
            (SELECT count(*)::int FROM findings x
               JOIN calls b ON b.id = x.call_id AND b.deleted_at IS NULL
              WHERE x.status = 'breach' AND b.call_date BETWEEN $1::date AND $2::date
                AND ${NOT_REJECTED}) AS breaches
       FROM calls c JOIN scores s ON s.call_id = c.id
      WHERE c.deleted_at IS NULL AND c.call_date BETWEEN $1::date AND $2::date`,
    [from, to],
  );
  const r = rows[0] ?? { scored: 0, avg: null, flagged: 0, breaches: 0 };
  return { ...r, flagRate: rate(r.flagged, r.scored), avg: oneDecimal(r.avg) };
}

/** mix: scored calls per name, the largest first, the rest folded into "Other". */
async function mix(db: Queryable, nameSql: string, join: string, from: string, to: string) {
  const { rows } = await db.query<{ name: string; calls: number }>(
    `SELECT ${nameSql} AS name, count(*)::int AS calls
       FROM calls c JOIN scores s ON s.call_id = c.id ${join}
      WHERE c.deleted_at IS NULL AND c.call_date BETWEEN $1::date AND $2::date
      GROUP BY 1 ORDER BY 2 DESC, 1`,
    [from, to],
  );
  const head = rows.slice(0, MIX_SIZE);
  const rest = rows.slice(MIX_SIZE).reduce((sum, r) => sum + r.calls, 0);
  return rest ? [...head, { name: "Other", calls: rest }] : head;
}

/** highlights: the period's headline numbers and the few groups and items worth acting on. */
export async function highlights(
  db: Queryable,
  rubric: RubricItem[],
  q: { from?: string | undefined; to?: string | undefined },
  today: Date,
): Promise<Highlights> {
  const range = periodRange(q, today);
  const { from, to } = range;
  const ranked = { from, to, page: 1, limit: HIGHLIGHT_SIZE, minCalls: RANKED_MIN_CALLS };
  const labels = new Map(rubric.map((i) => [i.key, i.label]));
  const [now, before, backlog, top, bottom, teams, failed, languages, products] = await Promise.all(
    [
      periodKpis(db, from, to),
      periodKpis(db, range.previousFrom, range.previousTo),
      db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM scores s
           JOIN calls c ON c.id = s.call_id AND c.deleted_at IS NULL
          WHERE s.review_status = 'pending'`,
      ),
      leaderboard(db, rubric, { ...ranked, groupBy: "agent", sort: "avgScore", dir: "desc" }),
      leaderboard(db, rubric, { ...ranked, groupBy: "agent", sort: "avgScore", dir: "asc" }),
      leaderboard(db, rubric, { ...ranked, groupBy: "team", sort: "flagRate", dir: "desc" }),
      db.query<{ item_key: string; failed: number; applicable: number }>(
        `WITH f AS (
           SELECT x.call_id, x.item_key,
                  bool_or(x.status IN ${NOT_PASSED}) AS bad,
                  bool_and(x.status = 'not_applicable') AS na
             FROM findings x JOIN calls c ON c.id = x.call_id AND c.deleted_at IS NULL
            WHERE c.call_date BETWEEN $1::date AND $2::date AND ${NOT_REJECTED}
            GROUP BY 1, 2)
         SELECT * FROM (
           SELECT item_key,
                  (count(*) FILTER (WHERE NOT na AND bad))::int AS failed,
                  (count(*) FILTER (WHERE NOT na))::int AS applicable
             FROM f GROUP BY 1) t
          WHERE failed > 0
          ORDER BY failed::numeric / NULLIF(applicable, 0) DESC, failed DESC, item_key
          LIMIT ${String(HIGHLIGHT_SIZE)}`,
        [from, to],
      ),
      mix(db, "c.language", "", from, to),
      mix(db, "p.name", "JOIN products p ON p.id = c.product_id", from, to),
    ],
  );
  return {
    ...range,
    kpis: {
      callsScored: { value: now.scored, previous: before.scored },
      avgScore: { value: now.avg, previous: before.avg },
      flagRate: { value: now.flagRate, previous: before.flagRate },
      breaches: { value: now.breaches, previous: before.breaches },
      reviewBacklog: backlog.rows[0]?.n ?? 0,
    },
    topAgents: top.items,
    bottomAgents: bottom.items,
    riskiestTeams: teams.items.filter((t) => t.flagged > 0),
    failedItems: failed.rows.map((r) => ({
      key: r.item_key,
      label: labels.get(r.item_key) ?? r.item_key,
      failed: r.failed,
      applicable: r.applicable,
      failRate: rate(r.failed, r.applicable) ?? 0,
    })),
    languageMix: languages,
    productMix: products,
  };
}
