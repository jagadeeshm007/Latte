# ADR-0009: Keep speech-to-text behind a segment-timestamp contract

- Status: Accepted
- Date: 2026-10-14
- Task: SCC-1
- Deciders: engineering, after the HLD review
- Area: speech
- Reversibility: awkward: a provider without segment timestamps breaks the time map, grounding and click-to-seek

## Context

ADR-0005 chose Groq whisper-large-v3 per channel and called the choice cheap to reverse because "the stt provider is configuration". The HLD review (critic, 2026-10-14) showed that is wrong: OpenRouter and Gemini expose no transcription endpoint that returns verbose_json segment timestamps, and the silence time map, quote grounding and playback all depend on segment times. Production volume also depends on a Groq plan decision (HLD section 8).

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Groq whisper-large-v3 behind an STT adapter whose contract is segments with start, end, text, language (chosen) | a second vendor still needs an adapter and a recorded test | any vendor returning segment timestamps |
| Treat STT as provider configuration like chat | false: no other configured provider returns segments | never |

## Decision

We will keep ADR-0005's pipeline and model, and put transcription behind an adapter whose output is a list of segments with start and end seconds, text and language; the gateway ships the Groq adapter and names OpenAI's /audio/transcriptions (whisper-1, verbose_json) as the second vendor to add if the Groq plan is refused, because both return segment timestamps.

## Consequences

Provider configurability (REQ-023) covers chat; STT is limited to segment-returning vendors (Q-010). Revisit when the Groq plan decision is made.

## Commits us to

Groq whisper-large-v3, mpg123-decoder (WASM), wavefile; OpenAI whisper-1 as the named fallback (not built)
