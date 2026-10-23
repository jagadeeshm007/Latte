# ADR-0032: Pipeline jobs behind a portable queue port, on Vercel Queues first

- Status: Accepted
- Date: 2026-10-23
- Task: SCC-4-0 (Intent SCC-4)
- Deciders: the product owner, who chose Vercel Queues over the recommended fix to pg-boss
- Area: jobs, deployment
- Supersedes: on Vercel, the processing on upload in ADR-0029, once SCC-4 ships; the pg_cron backstop stays with a new role
- Reversibility: easy: every queue system is an adapter behind one port, chosen by configuration; switching is a setting plus, for a new system, an adapter that passes the shared contract tests

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

Jobs go through a **queue port** that names no queue system, and each system is an **adapter** behind it. On Vercel the adapter is Vercel Queues, consumed by push-mode functions; locally and in the Docker stack it stays pg-boss with the worker. Kafka, SQS, RabbitMQ or another system later is a new adapter, not a change to the pipeline.

### The port (`apps/api/src/jobs/bus.ts`)

- **Publish:** `publish(topic, message, { delaySeconds?, priority?, idempotencyKey? })`. It replaces today's `Enqueue`, which becomes a thin wrapper so callers do not change.
- **Consume:** `subscribe(topic, handler, { concurrency, maxAttempts })`. The handler gets `{ id, topic, attempt, message }`; returning acknowledges, throwing means retry, and after `maxAttempts` an `onExhausted` hook runs (the call is marked failed). Push systems (Vercel Queues, a Kafka consumer group, SQS with Lambda) call the handler; pull systems (pg-boss) run it from a loop or a time-budgeted drain.
- **Messages:** a versioned JSON envelope with ids only, `{ v: 1, callId, reschedules? }`, parsed with Zod where it is consumed, so any system that carries bytes can carry it and old and new deployments can tell versions apart.
- **Capabilities:** each adapter declares what it does natively (`delay`, `priority`, `dedupe`); the port emulates what is missing, for example a delayed retry on Kafka through a retry topic or a due-time check, and never relies on ordering, which none of these guarantee for retries.
- **Choice:** `JOB_QUEUE` (`pgboss` or `vercel`) picks the adapter at start-up; nothing else in the code imports a queue library.
- **Contract tests:** one shared test suite (at-least-once delivery, retry then exhausted, delayed publish, concurrency cap, envelope validation) runs against every adapter, starting with an in-memory one, pg-boss and Vercel Queues. A new adapter is accepted when it passes the same suite.
- **Schedules stay out of the port.** Purge, alerts, digests and status keep their cron triggers (pg_cron on Vercel, the worker's schedule locally); a queue system is not asked to be a scheduler.

### On Vercel Queues

1. **Publishing and loss.** The Vercel Queues adapter is selected on Vercel. A publish happens after the call's row is committed, so a crash between the two can lose it; the pg_cron sweep becomes the recovery path: it republishes calls left in `uploaded` or `transcribed` past a cutoff, using an idempotency key of call id and stage so a republish within 24 hours is dropped by Vercel.
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
- Two adapters exist from the start (Vercel Queues on Vercel, pg-boss elsewhere), and both run the shared contract tests, which is what keeps a third (Kafka, SQS, RabbitMQ) a bounded piece of work.
- Features one system has and others lack (priority on pg-boss, deduplication on Vercel Queues) are optional in the port; the pipeline must work without them.

## Commits us to

The queue port and its contract tests as the only way jobs are published and consumed; the envelope `{ v, callId, reschedules? }`; the topic names `transcribe` and `score`; the idempotency key of call id and stage; and the pg_cron sweep as the recovery path for lost publishes.

## Update, 2026-10-23 (SCC-4-2, the Vercel Queues adapter)

What the build settled, without changing the decision:

- **Pace is configuration, not a constant.** The owner is moving from Groq's free tier to production limits, so the caps are not fixed at 2 and 3. `QUEUE_MAX_CONCURRENCY_TRANSCRIBE` and `QUEUE_MAX_CONCURRENCY_SCORE`, read at build time, set each trigger's `maxConcurrency`; unset means no cap. A rate-limited job still takes the existing delayed reschedule (up to `MAX_RESCHEDULES`).
- **One consumer function, two triggers.** `scripts/vercel-build.js` writes `functions/api/queues/pipeline.func`, subscribed to `transcribe` and `score` with `maxDeliveries` 5. Its path is under `/api`, so an outside request is routed to the API function instead. That Vercel's own deliveries still reach a function shadowed by that route is untested until the first deployment.
- **Vercel Queues is the default on Vercel (SCC-4-3).** The build uses it unless `JOB_QUEUE=pgboss` is set, and writes the choice into each function's environment, so build and runtime cannot disagree. pg-boss stays the default for local runs, Docker and tests.
- **Push is a declared capability.** The port's capabilities gain `delivery: "pull" | "push"`. The shared contract suite drives adapters through `fetch`, so it covers the pull adapters (memory, pg-boss); the Vercel adapter's tests cover the envelope, the attempt count and the retry backoff (30 s doubling, at most an hour) against a stand-in client.
- **The sweep.** With push delivery the minute cron runs `republishWaiting` instead of a drain: calls in `uploaded` or `transcribed` for more than 10 minutes are published again, at most 100 a run, keyed by call id, stage and the time the call last moved, so a repeat sweep is dropped and a call that moved on gets a new key.
- **No priority on Vercel Queues.** An interactive upload waits behind a batch in the same topic.

