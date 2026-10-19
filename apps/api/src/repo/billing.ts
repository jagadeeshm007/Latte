import type { BillingPrices, Statement } from "@scc/shared";

import type { Queryable } from "../db/pool.ts";

// Usage statements (ADR-0026): what a month of calls cost, worked out from
// the calls scored and the model spend recorded, priced from the one price
// row. Nothing is stored per month, so a statement always matches the data.

const money = (n: number) => Math.round(n * 100) / 100;

export async function getPrices(db: Queryable): Promise<BillingPrices> {
  const { rows } = await db.query<{
    currency: string;
    usd_rate: number;
    per_call: number;
    per_audio_minute: number;
    model_markup_pct: number;
  }>(
    "SELECT currency, usd_rate, per_call, per_audio_minute, model_markup_pct FROM billing_prices WHERE id = 1",
  );
  const r = rows[0];
  if (!r) throw new Error("billing_prices has no row; run the migrations");
  return {
    currency: r.currency,
    usdRate: r.usd_rate,
    perCall: r.per_call,
    perAudioMinute: r.per_audio_minute,
    modelMarkupPct: r.model_markup_pct,
  };
}

export async function setPrices(db: Queryable, p: BillingPrices, by: string): Promise<void> {
  await db.query(
    `UPDATE billing_prices
        SET currency = $1, usd_rate = $2, per_call = $3, per_audio_minute = $4, model_markup_pct = $5,
            updated_by = $6, updated_at = now()
      WHERE id = 1`,
    [p.currency, p.usdRate, p.perCall, p.perAudioMinute, p.modelMarkupPct, by],
  );
}

/** monthRange: the first day of the month and the first day of the next, as ISO dates. */
export function monthRange(month: string): { from: string; to: string; next: string } {
  const [y = 0, m = 1] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const next = new Date(Date.UTC(y, m, 1));
  const last = new Date(next.getTime() - 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(first), to: iso(last), next: iso(next) };
}

interface Row {
  name: string;
  calls: number;
  ms: number;
  cost: number;
}

/** breakdown: calls, audio and model spend per team, product or API key in the month. */
async function breakdown(db: Queryable, nameSql: string, join: string, range: unknown[]) {
  // One score per call, so each call counts once; its model spend is summed per call first.
  const { rows } = await db.query<Row>(
    `SELECT ${nameSql} AS name, count(*)::int AS calls,
            coalesce(sum(c.duration_ms), 0)::bigint AS ms,
            coalesce(sum(mc.cost), 0) AS cost
       FROM calls c JOIN scores s ON s.call_id = c.id ${join}
       LEFT JOIN LATERAL (
         SELECT sum(m.cost_usd) AS cost FROM model_calls m
          WHERE m.call_id = c.id AND m.status = 'ok'
            AND m.created_at >= $1::date AND m.created_at < $2::date) mc ON true
      WHERE s.created_at >= $1::date AND s.created_at < $2::date
      GROUP BY 1 ORDER BY 2 DESC, 1`,
    range,
  );
  return rows.map((r) => ({
    name: r.name,
    calls: r.calls,
    audioMinutes: Math.round((r.ms / 60_000) * 10) / 10,
    modelCostUsd: Math.round(r.cost * 10_000) / 10_000,
  }));
}

export async function statement(db: Queryable, month: string): Promise<Statement> {
  const { from, to, next } = monthRange(month);
  const range = [from, next];
  const prices = await getPrices(db);
  const [usage, spend, byTeam, byProduct, byApiKey] = await Promise.all([
    db.query<{ calls: number; ms: number }>(
      `SELECT count(*)::int AS calls, coalesce(sum(c.duration_ms), 0)::bigint AS ms
         FROM calls c JOIN scores s ON s.call_id = c.id
        WHERE s.created_at >= $1::date AND s.created_at < $2::date`,
      range,
    ),
    db.query<{ cost: number }>(
      `SELECT coalesce(sum(cost_usd), 0) AS cost FROM model_calls
        WHERE status = 'ok' AND created_at >= $1::date AND created_at < $2::date`,
      range,
    ),
    breakdown(db, "t.name", "JOIN teams t ON t.id = c.team_id", range),
    breakdown(db, "p.name", "JOIN products p ON p.id = c.product_id", range),
    breakdown(
      db,
      "coalesce(k.name, 'In the app')",
      "JOIN batches b ON b.id = c.batch_id LEFT JOIN api_keys k ON k.id = b.api_key_id",
      range,
    ),
  ]);
  const calls = usage.rows[0]?.calls ?? 0;
  const minutes = Math.round(((usage.rows[0]?.ms ?? 0) / 60_000) * 10) / 10;
  const costUsd = Math.round((spend.rows[0]?.cost ?? 0) * 10_000) / 10_000;
  const modelRate = prices.usdRate * (1 + prices.modelMarkupPct / 100);
  const lines = [
    {
      label: "Calls scored",
      quantity: calls,
      unit: "call",
      unitPrice: prices.perCall,
      amount: money(calls * prices.perCall),
    },
    {
      label: "Audio processed",
      quantity: minutes,
      unit: "minute",
      unitPrice: prices.perAudioMinute,
      amount: money(minutes * prices.perAudioMinute),
    },
    {
      label: `Model usage, at cost plus ${String(prices.modelMarkupPct)}%`,
      quantity: costUsd,
      unit: "USD",
      unitPrice: Math.round(modelRate * 10_000) / 10_000,
      amount: money(costUsd * modelRate),
    },
  ];
  return {
    month,
    from,
    to,
    prices,
    lines,
    total: money(lines.reduce((sum, l) => sum + l.amount, 0)),
    byTeam,
    byProduct,
    byApiKey,
  };
}
