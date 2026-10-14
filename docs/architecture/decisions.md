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
