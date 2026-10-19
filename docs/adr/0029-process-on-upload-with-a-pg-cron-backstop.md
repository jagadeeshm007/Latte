# ADR-0029: Process calls on upload, with Supabase pg_cron as the backstop

- Status: Accepted
- Date: 2026-10-19
- Task: SCC-1
- Deciders: engineering, with the product owner (approved `@vercel/functions` and pg_cron)
- Area: deployment, jobs
- Amends: ADR-0020 (scheduling)
- Reversibility: easy: the queue, handlers and cron routes are unchanged; remove the jobs with `cron.unschedule`

## Context

On the Vercel Hobby plan, Vercel Cron runs at most once a day, so ADR-0020 leaned on a GitHub Actions schedule every 5 minutes. GitHub runs schedules late, often by 10 to 30 minutes, and pauses them on quiet repositories. An uploaded call waited that long before it was transcribed, and the first production check only passed after running the workflow by hand.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Keep the GitHub Actions schedule | late and best effort by design | nothing time-sensitive |
| Vercel Pro for minute crons | paid, and still up to a minute after upload | teams already on Pro |
| The API calls its own `/api/cron/work` after an upload | an extra invocation per upload, and it relies on a request cut off early | no new dependency allowed |
| A queue service (QStash, Inngest) | a new vendor; pg-boss already holds the jobs | high fan-out |
| `waitUntil` after enqueue, plus Supabase pg_cron every minute (chosen) | two mechanisms to know about | today's volume, on Hobby |

## Decision

- **Processing on upload.** On Vercel, `enqueue` queues the job and calls `kick()` (`jobs/background.ts`). The request keeps its function alive with `waitUntil` from `@vercel/functions` and drains the queue after its response.
  - One drain runs per instance; work queued meanwhile makes it go round once more.
  - Each pass is budgeted from `getDeadline()`, minus a minute for the job in hand.
  - Jobs delayed on purpose (rate-limit reschedules) do not kick.
- **Connections.** `attachDatabasePool` closes idle connections before Vercel suspends an instance.
- **Backstop.** Supabase `pg_cron` calls `/api/cron/<task>` through `pg_net` (`make supabase-cron`): work every minute, status every 5 minutes, alerts and digests hourly, purge daily. `CRON_SECRET` is kept in Supabase Vault and read when a job runs, so it never appears in `cron.job`.
- **Background tasks.** The cron routes on Vercel answer at once and run the task in `waitUntil`, because `pg_net` stops waiting after 5 seconds.
- **Retired.** The GitHub Actions `cron` workflow and its `LATTE_URL` variable and `CRON_SECRET` secret.
- **Locally** nothing changes: outside Vercel `waitUntil` does nothing and the worker process runs the jobs.

## Consequences

- A call starts transcribing within seconds of its upload; a retry after a failure waits up to a minute for the backstop.
- A drain shares the upload request's function invocation, so a large batch upload keeps that invocation running for up to its 300 s limit. Each such second counts as function time.
- The schedule lives in the hosted database, not the repository. `make supabase-cron` is the source of truth, and re-running it updates the jobs by name.

## Commits us to

`@vercel/functions` (pinned 3.10.1), and Supabase's `pg_cron`, `pg_net` and Vault on the hosted project.
