# Architecture decisions: SalesCall

One row per decision, and every contradiction settled once so it is not
settled again, differently, in each file that runs into it.

## Decisions

| Id | Title | Area | Status | Reversibility |
| --- | --- | --- | --- | --- |
| ADR-0001 | Use one pnpm monorepo for web, API and shared types | repository | Accepted | cheap: split packages into repos with history kept |
| ADR-0002 | Use Express 5 for the API instead of the template's Fastify | api framework | Accepted | awkward: route handlers and middleware rewritten |
| ADR-0003 | Use hosted Supabase for Postgres, Auth and recording storage | database | Accepted | awkward: auth and storage calls move to another provider |
| ADR-0004 | Use pg-boss on Postgres for background jobs | messaging | Accepted | cheap: queue calls sit behind src/jobs |
| ADR-0005 | Use Groq Whisper over the API for speech-to-text, per channel | speech | Superseded by ADR-0009 | cheap: the gateway's stt provider is configuration |
| ADR-0006 | Use Groq gpt-oss-120b with strict JSON schema as the rubric judge | llm | Accepted | cheap: model and provider are configuration |
| ADR-0007 | Use Groq Orpheus TTS to voice the synthetic seed calls | speech | Accepted | cheap: seed audio is a one-off artefact |
| ADR-0008 | Use coss ui on React 19 with Vite and TanStack for the web app | frontend | Accepted | awkward: components re-skinned |
| ADR-0009 | Keep speech-to-text behind a segment-timestamp contract | speech | Accepted | awkward: a provider without segment timestamps breaks the time map, grounding and click-to-seek |
| ADR-0010 | Use parameterised SQL with pg instead of Drizzle | orm | Accepted | cheap: repositories in apps/api/src/repo are the only SQL; swapping the query layer touches those files |
| ADR-0011 | Use the audio/ui waveform for the call player | web ui | Accepted | cheap: one component |
| ADR-0012 | Use AI Elements transcription for the call transcript | web ui | Accepted | cheap: one component |
| ADR-0013 | Store word timestamps as jsonb on transcript segments | data model | Accepted | moderate: migration 0003 has a down file |
| ADR-0014 | Use Sarvam for Indian-language calls | speech | Accepted | cheap: a gateway provider and routes |
| ADR-0015 | Archive and delete calls by hiding them | data model | Accepted | moderate: migration 0005 has a down file |
| ADR-0016 | Use Recharts for dashboard charts | web ui | Accepted | cheap: charts in two components |
| ADR-0017 | Batches as a table, and batch exports streamed by the API | api, data model | Accepted | moderate: migration 0007 has a down file |
| ADR-0018 | Scoped API keys, Postgres rate limits and per-key request logs | api, auth | Accepted | moderate: migration 0008 has a down file |
| ADR-0019 | A TypeScript SDK as a workspace package | sdk | Accepted | cheap: packages/sdk depends only on @scc/shared |
| ADR-0020 | Deploy everything on Vercel, with Vercel Cron draining the job queue | deployment, jobs | Accepted; scheduling amended by ADR-0029 (processing on upload, Supabase pg_cron) | easy: server.ts and worker.ts still run the same code as long-lived processes |
| ADR-0021 | Webhooks through an outbox, signed, with an SSRF guard | api, integrations, security | Accepted | moderate: migration 0009 has a down file |
| ADR-0022 | Idempotency keys on create endpoints | api | Accepted | easy: one middleware and one table (migration 0009) |
| ADR-0023 | PII redaction by default, a rubric per product, retention per team | data model, compliance, scoring | Accepted | moderate: migration 0011 has a down file; redaction is applied on read, so stored text is unchanged |
| ADR-0024 | Single sign-on, invite-only, through Supabase Auth | auth | Accepted | easy: provider buttons follow `VITE_AUTH_PROVIDERS`; migration 0012 has a down file |
| ADR-0025 | In-app notifications, saved views, flag-rate alerts and digests | product, jobs | Accepted | easy: migration 0010 has a down file; email can be added as another channel |
| ADR-0026 | Usage statements without payments, and a public status page | billing, operations | Accepted | easy: migration 0013 has a down file |
| ADR-0027 | A zero-dependency SDK, installed from GitHub releases | sdk, distribution | Accepted | easy: the same tarball can be published to npm later |
| ADR-0028 | Run everything locally in Docker, with only model keys from outside | development, deployment | Accepted | easy: hosted Supabase and Vercel keep working unchanged |
| ADR-0029 | Process calls on upload, with Supabase pg_cron as the backstop | deployment, jobs | Accepted | easy: the queue, handlers and cron routes are unchanged; remove the jobs with `cron.unschedule` |
| ADR-0030 | Calls uploaded as transcripts, and a notice when a batch finishes | api, data model, pipeline, sdk, web | Accepted | moderate: migration 0014 has a down file, which refuses while transcript calls exist |
| ADR-0031 | Python, Go and Java SDKs generated from the OpenAPI document | sdk, distribution | Accepted | easy: any SDK can later be hand-written or published to a registry under the same names |
| ADR-0032 | Pipeline jobs on Vercel Queues, with a global concurrency cap | jobs, deployment | Accepted | moderate: jobs go through the `Enqueue` interface, so the pg-boss path can be switched back on |

## Conflicts that were settled

### Whether faster-whisper and Piper from the spec still apply

**Between:** PRD constraints (spec text), ADR-0005, ADR-0007, US-01-002, US-02-002

**Decision.** Groq Whisper replaces faster-whisper and Groq Orpheus replaces Piper; the audio split, silence trimming and stereo mixing are written in TypeScript.

**Why.** The user ruled out Python and local models in the session of 2026-10-14.

**Settled by:** the requester (product owner), 2026-10-14

**What now has to change to match:**
- PRD constraints already record the replacement; no story changes.

### Whether "one model call per call" allows transcription calls

**Between:** REQ-009, US-01-003 AC-1, ADR-0005

**Decision.** "One model call per call" applies to scoring: exactly one chat call scores a call. Transcription calls (one or more per channel chunk) are separate model calls and also go through the gateway.

**Why.** The spec says "One model call per call scores the transcript"; transcription precedes scoring and is a different task.

**Settled by:** Proposed (engineering), 2026-10-14

**What now has to change to match:**
- US-01-003 AC-1 counts chat calls only; already worded so.
