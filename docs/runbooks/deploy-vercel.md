# Runbook: deploy Latte on Vercel

Owner: engineering. Covers ADR-0020. One Vercel project serves the web app,
the API (one Node 24 function) and the scheduled jobs (Vercel Cron).

## First deploy

`make setup-deploy` (`scripts/setup-deploy.sh`) does steps 1 and 5 of the setup below from your `.env`. It creates and links the project, connects GitHub and sets every variable. It never pushes, deploys or migrates. Then, in order:

1. Run `make setup-deploy`. If it reports that GitHub could not be connected, first add GitHub as a login connection: Vercel > Account Settings > Authentication > Connect GitHub. Then give the Vercel GitHub App access to the repository, and run it again or connect under Project > Settings > Git.
2. Apply the migrations to the hosted database: `pnpm --filter @scc/api migrate`. Then `make seed` once, if the project has no users yet.
3. Push the branch. Vercel builds a preview deployment of it.
4. Open the PR and merge it to `main`. Vercel builds production.
5. Read the production URL under Project > Domains. Run `LATTE_URL=<url> make setup-deploy`, then redeploy so the function reads the new `WEB_ORIGIN` for invitations: `vercel redeploy <url> --target production` (this CLI has no `--prod` on `redeploy`).
6. In Supabase > Authentication > URL Configuration, set the site URL to the production URL and add `https://*-jagadeesh-1727.vercel.app/**` for previews.
7. Schedule the backstop in Supabase: `LATTE_URL=<url> make supabase-cron` (see Background work below).
8. Release the SDK: push the tag `sdk-v0.1.0`.

## One-time setup

1. **Project.** Import the repository in Vercel with the root directory at the
   repository root. `vercel.json` sets the install command
   (`pnpm install --frozen-lockfile`) and the build command
   (`node scripts/vercel-build.js`), which writes `.vercel/output`. Leave the
   framework preset as "Other".
2. **Database.** Use the Supabase **session pooler** connection string (port
   5432), not the transaction pooler: pg-boss needs session features. Set
   `DB_POOL_MAX=2`; each function instance holds that plus one for pg-boss.
3. **Migrations.** Run them from your machine or CI before the first deploy and
   before every deploy that adds one, never from the function:

   ```bash
   DATABASE_URL="<session pooler url>" pnpm --filter @scc/api migrate
   ```

4. **Storage bucket and first users.** `make seed` against the hosted project
   once (creates the bucket, reference data and the default rubric). Invite
   everyone else from the Members page.
5. **Environment variables** (Project Settings > Environment Variables, for
   Production and Preview separately):

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | do not set: the build sets it inside the function, and as a project variable it would skip devDependencies at install |
   | `DATABASE_URL` | Supabase session pooler URL |
   | `DB_SSL` | `true` |
   | `DB_SSL_CA_PEM` | the Supabase root CA as text (Database > SSL Configuration). The build writes it beside the function and sets `DB_SSL_CA`, so the server certificate is verified. Without it the connection is encrypted but not verified. Do not set `DB_SSL_CA` itself |
   | `DB_POOL_MAX` | `2` |
   | `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL` | from Supabase > Project Settings > API |
   | `WEB_ORIGIN` | the production URL, for example `https://latte.example.com` |
   | `EXPORT_LINK_SECRET` | `openssl rand -hex 32`; required, because many instances serve traffic |
   | `DATA_ENCRYPTION_KEY` | `openssl rand -hex 32`; keep a copy outside Vercel, losing it voids every webhook secret |
   | `CRON_SECRET` | `openssl rand -hex 32`; Vercel Cron sends it automatically |
   | `GROQ_API_KEY`, `SARVAM_API_KEY` (and optional `OPENROUTER_API_KEY`, `GEMINI_API_KEY`) | provider keys |
   | `LLM_BUDGET_USD`, `AUDIO_RETENTION_DAYS` | as for any deployment |
   | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | public, inlined into the web build |
   | `VITE_AUTH_PROVIDERS` | for example `google,azure,saml` once set up (`sso.md`) |
   | `VITE_API_URL` | leave unset: the API is on the same origin |
   | `VERCEL_CRON_PLAN` | `hobby` on a Hobby team, otherwise unset |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1`, so Vercel installs with the pnpm version in `package.json` |

6. **Supabase Auth URLs.** Add the production URL (and the preview pattern) to
   Authentication > URL Configuration, so invitations and SSO return to Latte.

The function runs in `bom1` (Mumbai), next to the Supabase database in `ap-south-1`. `VERCEL_FUNCTION_REGION` at build time changes it.

## Background work

Calls are processed as soon as they are uploaded (ADR-0029). The request that queues a job keeps its function running after the response (`waitUntil`) and drains the queue until it is empty or about a minute before the function's 300 s limit.

Anything a drain leaves behind (retries after a failure or rate limit, long backlogs, scheduled jobs) is picked up by Supabase `pg_cron`. It calls `/api/cron/*` through `pg_net`, with `CRON_SECRET` read from Supabase Vault:

| Job | Schedule | Task |
| --- | --- | --- |
| `latte-work` | every minute | drain the queues, deliver webhooks |
| `latte-status` | every 5 minutes | record the status page checks |
| `latte-alerts` | hourly | evaluate alert rules |
| `latte-digests` | hourly | send due digests |
| `latte-purge` | 02:15 daily | delete audio past retention |
| `latte-cron-history` | 03:30 daily | keep a week of `cron.job_run_details` |

`make supabase-cron` sets these up and is safe to run again. Each task answers at once and runs in the background, because `pg_net` stops waiting after 5 seconds. Vercel Cron keeps its own daily schedule as a last resort (`VERCEL_CRON_PLAN=hobby`; on Pro, unset it for minute crons and the Supabase jobs become a second backstop).

Check the jobs in Supabase > SQL editor:

```sql
SELECT jobname, status, start_time FROM cron.job_run_details
JOIN cron.job USING (jobid) ORDER BY start_time DESC LIMIT 10;
```

`SELECT cron.unschedule('latte-work');` stops one.

## Deploy

Pushing to `main` deploys through the Git integration. From a machine:

```bash
make vercel-build
```

```bash
vercel deploy --prebuilt --prod
```

## Check after a deploy

- `GET /api/health` answers `{"status":"ok"}` and `GET /api/ready` answers `ready`.
- `/status` shows every component as operational.
- `cron.job_run_details` shows `latte-work` succeeding every minute.
- `LATTE_URL=<url> make e2e-check` passes: an uploaded call is scored within a minute or two.

## Rollback

Vercel > Deployments > the previous deployment > Instant Rollback. A rollback
does not undo a migration: every migration has a down file
(`apps/api/src/db/migrations/*.down.sql`); run it by hand only if the old code
cannot work with the new schema.

## When something is wrong

| Symptom | Check | Action |
| --- | --- | --- |
| Calls stay Uploaded | Vercel logs for `background drain`; `cron.job_run_details` for `latte-work`; a 401 in `net._http_response` means `CRON_SECRET` differs | `make supabase-cron` again after changing the secret, so Vault matches Vercel |
| `stoppedBy: "budget"` on every run | the queue is behind | expected under a burst; if it persists, lower upload rate or move the worker to a long-lived host (`make dev-worker` code runs unchanged) |
| `/api/ready` 503 | the database URL and pooler mode | must be the session pooler; check Supabase status |
| Webhooks not sent | `DATA_ENCRYPTION_KEY` set; endpoint enabled; delivery log on the endpoint page | redeliver from the log |
| Too many connections | Supabase > Database > Connections | lower `DB_POOL_MAX` to 1 |
