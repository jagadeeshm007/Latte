# ADR-0005: Use Groq Whisper over the API for speech-to-text, per channel

- Status: Superseded by ADR-0009
- Date: 2026-10-14
- Task: SCC-1
- Deciders: the requester (product owner), engineering
- Area: speech
- Reversibility: cheap: the gateway's stt provider is configuration

## Context

The spec named faster-whisper; the user replaced it in the session: TypeScript only, no Python, no local models. Groq Whisper accepts one audio track and downsamples to mono, so stereo must be split before sending. Groq limits: 25 MB (free) or 100 MB (dev) per file, 20 RPM, 7,200 audio seconds per hour on the base plan.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Groq whisper-large-v3 per channel, after silence trimming in TypeScript (chosen) | audio leaves our system for Groq; per-hour cost doubles because both channels are sent | teams without GPUs and with a Groq account |
| Groq whisper-large-v3-turbo | 12% WER vs 10.3% and no translation; cheaper ($0.04/h vs $0.111/h) | English-heavy volume where cost dominates; it stays configurable |
| Local faster-whisper | rejected by the user | on-premise privacy requirements |

## Decision

We will decode each recording in TypeScript, split left and right, trim silence with an energy VAD while keeping a time map, chunk under the file cap, and transcribe each channel with Groq whisper-large-v3 in verbose_json with segment timestamps and no forced language, because it is the most accurate hosted option for Hindi and code-mixed speech.

## Consequences

Silence trimming roughly halves billed audio and rate-limit use. Segment times are mapped back to call time. Revisit if Hindi WER on real calls is poor or a provider offers stereo-aware transcription.

## Commits us to

Groq whisper-large-v3, mpg123-decoder (WASM), wavefile
