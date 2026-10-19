// Schedules Latte's background tasks inside the hosted Supabase database
// (ADR-0029): pg_cron calls /api/cron/<task> through pg_net, with CRON_SECRET
// kept in Supabase Vault. Uploads already start processing on their own; this
// is the backstop for retries, scheduled jobs and anything left behind, and it
// replaces Vercel Cron's daily-only Hobby schedule.
//   LATTE_URL=https://latte-delta.vercel.app make supabase-cron
// Reads DATABASE_URL from .env and CRON_SECRET from .env.vercel (written by
// make setup-deploy); prints neither. Safe to run again: jobs are updated by name.
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const say = (line) => process.stdout.write(`supabase-cron: ${line}\n`);

const base = (process.env.LATTE_URL ?? "").replace(/\/+$/, "");
// An origin only, since it goes into the job's SQL text.
if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(base)) {
  throw new Error("set LATTE_URL to the production origin, e.g. https://latte-delta.vercel.app");
}
for (const file of [".env", ".env.vercel"]) {
  if (!existsSync(path.join(root, file))) throw new Error(`${file} not found`);
  process.loadEnvFile(path.join(root, file));
}
const secret = process.env.CRON_SECRET;
if (!secret || secret.length < 32) throw new Error("CRON_SECRET missing from .env.vercel");

const { loadConfig } = await import("../apps/api/src/config.ts");
const { createPool } = await import("../apps/api/src/db/pool.ts");
const pool = createPool({ ...loadConfig(), DB_POOL_MAX: 1 });

/** Every minute for work, as the deploy runbook and ADR-0029 describe. */
const SCHEDULES = {
  work: "* * * * *",
  status: "*/5 * * * *",
  alerts: "5 * * * *",
  digests: "10 * * * *",
  purge: "15 2 * * *",
};

try {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pg_cron");
  await pool.query("CREATE EXTENSION IF NOT EXISTS pg_net");
  // The secret lives in Vault; jobs read it when they run, so it never appears in cron.job.
  const { rows } = await pool.query(
    "SELECT id FROM vault.secrets WHERE name = 'latte_cron_secret'",
  );
  if (rows[0]) {
    await pool.query("SELECT vault.update_secret($1, $2)", [rows[0].id, secret]);
  } else {
    await pool.query("SELECT vault.create_secret($1, 'latte_cron_secret')", [secret]);
  }
  say("CRON_SECRET stored in Vault as latte_cron_secret");

  for (const [task, schedule] of Object.entries(SCHEDULES)) {
    const command = `SELECT net.http_get(
      url := '${base}/api/cron/${task}',
      headers := jsonb_build_object('Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'latte_cron_secret')),
      timeout_milliseconds := 5000)`;
    await pool.query("SELECT cron.schedule($1, $2, $3)", [`latte-${task}`, schedule, command]);
    say(`scheduled latte-${task} (${schedule})`);
  }
  // pg_cron keeps a row per run; a week is enough to look back on.
  await pool.query("SELECT cron.schedule($1, $2, $3)", [
    "latte-cron-history",
    "30 3 * * *",
    "DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'",
  ]);
  say("scheduled latte-cron-history (daily cleanup of run history)");
  say(`done. Check runs with: SELECT jobname, status, start_time FROM cron.job_run_details
  JOIN cron.job USING (jobid) ORDER BY start_time DESC LIMIT 10;`);
} finally {
  await pool.end();
}
