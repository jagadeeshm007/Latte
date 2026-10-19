# Runbook: deploy Latte on Vercel

Owner: engineering. Covers ADR-0020. One Vercel project serves the web app,
the API (one Node 24 function) and the scheduled jobs (Vercel Cron).

## First deploy

`make setup-deploy` (`scripts/setup-deploy.sh`) does steps 1 and 5 of the setup below from your `.env`. It creates and links the project, connects GitHub, sets every variable, and sets the GitHub cron fallback. It never pushes, deploys or migrates. Then, in order:

1. Run `make setup-deploy`. If it reports that GitHub could not be connected, first add GitHub as a login connection: Vercel > Account Settings > Authentication > Connect GitHub. Then give the Vercel GitHub App access to the repository, and run it again or connect under Project > Settings > Git.
2. Apply the migrations to the hosted database: `pnpm --filter @scc/api migrate`. Then `make seed` once, if the project has no users yet.
3. Push the branch. Vercel builds a preview deployment of it.
4. Open the PR and merge it to `main`. Vercel builds production, and the `cron` workflow starts running from `main`.
5. Read the production URL under Project > Domains. Run `LATTE_URL=<url> make setup-deploy`, then redeploy so the function reads the new value: `vercel redeploy <url> --target production` (this CLI has no `--prod` on `redeploy`). That sets `WEB_ORIGIN` for invitations and turns on the cron fallback. Until then the fallback skips, because it sends `CRON_SECRET` to that URL and must never guess it.
6. In Supabase > Authentication > URL Configuration, set the site URL to the production URL and add `https://*-jagadeesh-1727.vercel.app/**` for previews.
7. Release the SDK: push the tag `sdk-v0.1.0`.

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

## Plan limits

| | Pro | Hobby |
| --- | --- | --- |
| Crons | every minute (work), 5 minutes (status), hourly (alerts, digests), nightly (purge) | daily only: build with `VERCEL_CRON_PLAN=hobby` |
| Queue between drains | up to 1 minute | up to 5 minutes, through the `cron` GitHub Actions workflow |
| Function duration | 300 s used (`maxDuration`) | 300 s with Fluid compute |

For the Hobby fallback, set the repository variable `LATTE_URL` (the
production URL) and the repository secret `CRON_SECRET` (the same value as in
Vercel). On Pro, leave `LATTE_URL` unset and the workflow skips.

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
- Vercel > Project > Cron Jobs lists five jobs; run `work` once by hand and
  check its log line `cron task finished` with `stoppedBy`.
- Upload one call and watch it reach Scored within two drains.

## Rollback

Vercel > Deployments > the previous deployment > Instant Rollback. A rollback
does not undo a migration: every migration has a down file
(`apps/api/src/db/migrations/*.down.sql`); run it by hand only if the old code
cannot work with the new schema.

## When something is wrong

| Symptom | Check | Action |
| --- | --- | --- |
| Calls stay Uploaded | Cron Jobs log for `/api/cron/work`; a 401 means `CRON_SECRET` differs | Set the same secret, redeploy, run `work` by hand |
| `stoppedBy: "budget"` on every run | the queue is behind | expected under a burst; if it persists, lower upload rate or move the worker to a long-lived host (`make dev-worker` code runs unchanged) |
| `/api/ready` 503 | the database URL and pooler mode | must be the session pooler; check Supabase status |
| Webhooks not sent | `DATA_ENCRYPTION_KEY` set; endpoint enabled; delivery log on the endpoint page | redeliver from the log |
| Too many connections | Supabase > Database > Connections | lower `DB_POOL_MAX` to 1 |
