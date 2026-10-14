# ADR-0004: Use pg-boss on Postgres for background jobs

- Status: Accepted
- Date: 2026-10-14
- Task: SCC-1
- Deciders: the requester (product owner), engineering
- Area: messaging
- Reversibility: cheap: queue calls sit behind src/jobs

## Context

Transcription and scoring must run outside the upload request (REQ-006), retry on provider errors and respect Groq rate limits. Postgres already exists; no Redis is provisioned.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| pg-boss on the Supabase Postgres (chosen) | job throughput bounded by Postgres; fine at 20,000 calls a month (about 1 job a minute) | a Postgres-only stack at moderate volume |
| BullMQ + Redis | another managed service to run | high-throughput queues |
| A hand-written jobs table with SKIP LOCKED | retries, backoff and dead-letter written by hand | teams avoiding dependencies |

## Decision

We will run queues transcribe, score and purge on pg-boss with retry, exponential backoff and a dead-letter queue, consumed by a separate worker process, because it needs no new infrastructure and gives retries for free.

## Consequences

Worker concurrency is the main lever against Groq limits. Revisit above roughly 50 jobs a second.

## Commits us to

pg-boss 10
