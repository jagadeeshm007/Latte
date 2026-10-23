# Progress: SCC-4 VercelQueues

- Task: SCC-4
- Title: VercelQueues
- Branch: feature/SCC-4-VercelQueues
- Status: in progress
- Owner: Jagadeesh
- Started: 2026-10-23
- Updated: 2026-10-23
- Acceptance criteria: 6

## Next
- Merge SCC-4-2 (PR #22) and SCC-4-3 into the Intent, then the first deployment on Vercel Queues: `LATTE_URL=<url> make e2e-check`
- Then the Intent PR into main

## Done
- SCC-4-0: ADR-0032, jobs behind a portable queue port, Vercel Queues on Vercel (PR #19)
- SCC-4-1: the queue port, contract tests, memory and pg-boss adapters (PR #20)
- SCC-4-2: the Vercel Queues adapter, consumer function, configurable caps, lost-publish sweep (PR #22)
- SCC-4-3: Vercel Queues as the default for Vercel builds; deploy and operations runbooks, HLD jobs lines

## Blockers
- none

## Decisions
- Vercel Queues, push mode, behind a portable port (ADR-0032)
- Concurrency caps are build-time configuration, unset meaning no cap (owner, 2026-10-23: production provider limits replace Groq's free tier)
- Vercel builds default to Vercel Queues; `JOB_QUEUE=pgboss` goes back

## Links
- MR: none
- Ticket: none
