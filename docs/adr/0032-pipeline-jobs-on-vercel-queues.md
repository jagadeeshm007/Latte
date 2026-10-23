# ADR-0032: Pipeline jobs on Vercel Queues, with a global concurrency cap

- Status: Accepted
- Date: 2026-10-23
- Task: SCC-4-0 (Intent SCC-4)
- Deciders: the product owner, who chose Vercel Queues over the recommended fix to pg-boss
- Area: jobs, deployment
- Supersedes: on Vercel, the processing on upload in ADR-0029, once SCC-4 ships; the pg_cron backstop stays with a new role
- Reversibility: moderate: jobs go through the `Enqueue` interface, so the pg-boss path can be switched back on

## Context

On Vercel, the transcribe and score jobs run in pg-boss and are drained by the upload request (`waitUntil`, ADR-0029) and a pg_cron sweep every minute. Two things limit it as it grows:

- **Rate limits are counted per process.** `packages/gateway/src/limiter.ts` keeps its counts in memory, so parallel Vercel instances each think they have the whole Groq limit and together exceed it, then wait on 429s.
- **Work is drained in waves.** One instance claims 2 jobs per queue per pass within its 300-second budget; what is left waits for the next minute's sweep.

The ceiling for a demo is not the queue. On Groq's free tier (checked 2026-10-23), the judge has 8,000 tokens a minute and 200,000 a day, and a call uses about 2,400 judge tokens (the eval: 47,740 tokens for 20 calls). That is about 3 calls scored a minute and about 80 a day, so a batch of 10 takes at least about 3.5 minutes whatever runs it. Transcription (20 requests a minute, 7,200 audio seconds an hour) is not the binding limit for 10 calls.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Keep pg-boss; share the rate limit through Postgres and drain more in parallel (recommended) | stays on waitUntil and a minute sweep; we keep owning delivery and retries | the lowest cost and no new service |
| Vercel Queues, push mode (chosen) | public beta, not generally available; on Hobby the free 1M operations are for non-commercial use | one platform, a function per job, a global concurrency cap, built-in redelivery |
| Inngest | another vendor; $99 a month after the free 50k executions | step functions with throttling per key |
| Trigger.dev | compute billed against credit; the pipeline leaves Vercel | calls longer than a function's 300 seconds |
| Upstash QStash | each retry costs a message; 1,000 a day free | the simplest HTTP push |

## Decision

On Vercel, pipeline jobs are published to Vercel Queues and consumed by push-mode functions. Locally and in the Docker stack, pg-boss and the worker stay as they are.

1. **Publishing and loss.** `Enqueue` gets a Vercel Queues implementation selected on Vercel. A publish happens after the call's row is committed, so a crash between the two can lose it; the pg_cron sweep becomes the recovery path: it republishes calls left in `uploaded` or `transcribed` past a cutoff, using an idempotency key of call id and stage so a republish within 24 hours is dropped by Vercel.
2. **Where the consumer runs.** One topic per stage (`transcribe`, `score`), each with a private consumer function (a `queue/v2beta` trigger), the same 300-second limit and a visibility timeout extended while a long call is decoded.
3. **Calls to model providers.** A provider call that times out is not resent blindly: the job fails and its redelivery claims the call again, within the gateway's monthly budget, which keeps counting every attempt.
4. **Retries and the end state.** `maxDeliveries` on each trigger (5, close to today's `RETRY_LIMIT` of 4 plus the first try), with backoff from the SDK's retry callback. When deliveries run out the call is marked failed with its reason, which already sends `call.failed`.
5. **Pace.** Each consumer group gets a maximum concurrency matched to the provider limits (to start: transcribe 2, score 3), and a rate-limited job is redelivered after the wait the gateway reports, replacing today's delayed reschedule (up to `MAX_RESCHEDULES`, 12).
6. **Twice-delivered messages.** Handlers already claim a call with one conditional update (`claimCall`), so a second delivery of the same stage finds the call taken and does nothing.

## Consequences

- A batch of 10 runs as far as the concurrency caps and Groq allow, without waiting for the minute sweep; the free-tier floor of about 3.5 minutes for scoring remains.
- The gateway's per-process limiter stays; the concurrency caps keep parallel instances under the provider limits instead.
- Core processing depends on a beta service; its API (`queue/v2beta`, `experimentalTriggers`) may change before general availability.
- Queue usage is billed per operation; on Pro it comes out of the plan's usage, at about $0.60 per million operations.
- Two job paths exist (Vercel Queues on Vercel, pg-boss elsewhere) behind one interface; both need tests.

## Commits us to

The topic names, the idempotency key of call id and stage, and the pg_cron sweep as the recovery path for lost publishes.
