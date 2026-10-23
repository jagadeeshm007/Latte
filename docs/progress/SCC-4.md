# Progress: SCC-4 VercelQueues

- Task: SCC-4
- Title: VercelQueues
- Branch: feature/SCC-4-VercelQueues
- Status: merged
- Owner: Jagadeesh
- Started: 2026-10-23
- Updated: 2026-10-23
- Acceptance criteria: 6

## Next
- none: merged to main (PR #24, 91196b5)

## Done
- SCC-4-0: ADR-0032, jobs behind a portable queue port, Vercel Queues on Vercel (PR #19)
- SCC-4-1: the queue port, contract tests, memory and pg-boss adapters (PR #20)
- SCC-4-2: the Vercel Queues adapter, consumer function, configurable caps, lost-publish sweep (PR #22)
- SCC-4-3: Vercel Queues as the default for Vercel builds; deploy and operations runbooks, HLD jobs lines; consumer group named on each trigger, which Vercel requires (PR #23)
- Intent merged to main (PR #24, 2026-10-23)
- Production check, 2026-10-23: `LATTE_URL=https://latte-delta.vercel.app make e2e-check` passed, a call scored in 31 s. That the run went through Vercel Queues rests on production serving 91196b5 and the consumer function's logs; not checked from the repository

## Blockers
- none

## Decisions
- Vercel Queues, push mode, behind a portable port (ADR-0032)
- Concurrency caps are build-time configuration, unset meaning no cap (owner, 2026-10-23: production provider limits replace Groq's free tier)
- Vercel builds default to Vercel Queues; `JOB_QUEUE=pgboss` goes back

## Links
- MR: PR #19, #20, #22, #23 (units), PR #24 (Intent)
- Ticket: none
