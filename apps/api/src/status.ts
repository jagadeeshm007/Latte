// Prints the pipeline at a glance: recent calls with status and score, and
// this month's model spend by purpose. No transcript text, no personal data.
// Run: pnpm --filter @scc/api status
import { loadConfig } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { usageThisMonth } from "./repo/reference.ts";

const config = loadConfig();
const pool = createPool(config);
const out = (line: string) => process.stdout.write(`${line}\n`);
try {
  const { rows } = await pool.query<{
    id: string;
    status: string;
    error: string | null;
    overall_score: number | null;
    judge_status: string | null;
    review_status: string | null;
    findings: number;
    breaches: number;
  }>(
    `SELECT c.id, c.status, c.error, s.overall_score, s.judge_status, s.review_status,
            (SELECT count(*) FROM findings f WHERE f.call_id = c.id) AS findings,
            (SELECT count(*) FROM findings f WHERE f.call_id = c.id AND f.status = 'breach') AS breaches
       FROM calls c LEFT JOIN scores s ON s.call_id = c.id
      ORDER BY c.created_at DESC LIMIT 20`,
  );
  for (const r of rows) {
    out(
      `${r.id.slice(0, 8)}  ${r.status.padEnd(12)} score ${String(r.overall_score ?? "-").padStart(6)}  judge ${(r.judge_status ?? "-").padEnd(6)} review ${(r.review_status ?? "-").padEnd(12)} findings ${String(r.findings)} breaches ${String(r.breaches)}${r.error ? `  error: ${r.error}` : ""}`,
    );
  }
  const usage = await usageThisMonth(pool, config.LLM_BUDGET_USD);
  out(
    `spend ${usage.spentUsd.toFixed(4)} of ${usage.budgetUsd.toFixed(2)} USD: ${usage.byPurpose.map((p) => `${p.purpose} ${String(p.calls)} calls ${p.costUsd.toFixed(4)}`).join(", ")}`,
  );
} finally {
  await pool.end();
}
