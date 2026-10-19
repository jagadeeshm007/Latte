# ADR-0020: Deploy everything on Vercel, with Vercel Cron draining the job queue

- Status: Accepted; scheduling amended by ADR-0029 (processing on upload, Supabase pg_cron)
- Date: 2026-10-18
- Task: SCC-1
- Deciders: engineering, with the product owner (chose "all on Vercel + Cron")
- Area: deployment, jobs
- Reversibility: easy: server.ts and worker.ts still run the same code as long-lived processes

## Context

Latte runs as an API process, a worker process and a static web app. The team wants one Vercel project for all of it. Vercel Functions are request-scoped: nothing runs between requests, so a pg-boss worker that subscribes and waits has nowhere to live.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Web and API on Vercel, worker elsewhere (Fly, Railway) (not chosen) | two platforms to run and pay for | steady heavy transcription load |
| A queue service (QStash, Inngest) calling a function per job | a new dependency and vendor; pg-boss already holds the jobs | per-job fan-out at large scale |
| All on Vercel, Cron drains pg-boss (chosen) | throughput is bounded by the cron cadence and function duration | today's volume |

## Decision

- **Build Output API v3.** `scripts/vercel-build.js` writes `.vercel/output`: the Vite build in `static`, the API bundled into one ES module at `functions/api.func/index.mjs` (runtime `nodejs24.x`, `maxDuration` 300), and `config.json` with routes and crons. The bundle uses the web app's own Vite, so no build tool is added. `wavefile` is loaded with `createRequire`, so it is copied next to the bundle.
- **Routes.** `/api/*` goes to the function; real files next; everything else falls back to `index.html`. The web app calls the API on the same origin (`VITE_API_URL` empty).
- **The function.** `apps/api/src/vercel.ts` builds the same Express app as `server.ts`, once per instance, with pg-boss started without supervision or schedules and a pool of one connection for pg-boss.
- **Cron.** `GET /api/cron/{work,purge,alerts,digests,status}`, each requiring `Authorization: Bearer $CRON_SECRET` compared in constant time. Without a secret configured, every call is refused. `work` runs pg-boss's supervise pass, then `drainQueues` fetches and runs transcribe and score jobs until 240 s have passed, then delivers due webhooks.
- **One code path.** `jobs/drain.ts` holds `runPipelineJob`, which the local worker's `boss.work` and the cron drain both call.
- **Plans.** Pro: work every minute, status every 5 minutes, alerts and digests hourly, purge nightly. Hobby allows daily crons only: build with `VERCEL_CRON_PLAN=hobby` and the `cron` GitHub Actions workflow pings `/api/cron/work` every 5 minutes.
- **Migrations** are a release step run from CI or a machine, never at function start.

## Consequences

- A call waits up to a minute for the next drain on Pro (five on the Hobby fallback); a drain handles about 240 s of work. Large backlogs take several drains.
- A job still running when the function is stopped expires in pg-boss after 15 minutes and is retried; handlers already claim calls with a conditional update, so a retry does not double-score.
- `make vercel-smoke` loads the built function and checks health, readiness, cron refusal and a drain; CI runs it.

## Commits us to

The `/api/cron/*` routes and `CRON_SECRET`, the Build Output layout, and a session-mode Postgres connection (pg-boss needs it).
