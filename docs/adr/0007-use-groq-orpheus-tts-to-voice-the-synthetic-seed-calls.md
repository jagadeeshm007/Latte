# ADR-0007: Use Groq Orpheus TTS to voice the synthetic seed calls

- Status: Accepted
- Date: 2026-10-14
- Task: SCC-1
- Deciders: the requester (product owner), engineering
- Area: speech
- Reversibility: cheap: seed audio is a one-off artefact

## Context

The spec named Piper; the user chose Groq Orpheus in the session to keep TypeScript only. Orpheus is English only and the base plan allows 100 requests and 3,600 tokens a day; 20 calls need roughly 600 to 800 lines.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Orpheus per line, cached by hash, resumable across days (chosen) | rendering takes several days; Hindi lines are voiced in English | seed data only |
| Piper through a Node binding | a local model, rejected | offline rendering in one run |
| Text-only seeds | the transcription path is never exercised by the eval | the earliest days, as a fallback until audio exists |

## Decision

We will render each line with canopylabs/orpheus-v1-english through the gateway, cache it on disk by content hash, and mix agent lines to the left channel and customer lines to the right, because it is the TypeScript-only option the user chose.

## Consequences

Until a call is fully rendered, its eval transcript is built from the script with timings, so the gate works from day one. Revisit if a multilingual TTS becomes available on the configured providers.

## Commits us to

Groq canopylabs/orpheus-v1-english
