# ADR-0014: Use Sarvam for Indian-language calls, routed by the language chosen at upload

- Status: Accepted
- Date: 2026-10-15
- Task: SCC-1
- Deciders: engineering, with the product owner (routing, judging and language choices)
- Area: speech-to-text, translation
- Reversibility: moderate: the gateway's `sarvam` provider and the `sttRegional`, `translate` and `ttsRegional` routes are the only coupling; calls and transcripts keep their language and translations

## Context

Sales calls happen in Hindi, Telugu, Tamil and other Indian languages, usually mixed with English. Groq Whisper (ADR-0005, ADR-0009) is weak on these, and the judge reads English. Sarvam's saaras:v4 transcribes 22 Indian languages and code-mixed speech; Sarvam Translate translates them to English.

What Sarvam does not give:
- **Word timestamps**: chunk-level timestamps only, in both the real-time and batch APIs.
- **Long requests**: real-time requests take about 30 seconds of audio.
- **A license**: the `sarvamai` SDK's package declares none.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Uploader picks the language; English to Whisper, Indian languages to Sarvam; lines translated to English for the judge (chosen) | one more field at upload; regional calls read along line by line, not word by word | mixed English and regional call volumes |
| Sarvam for every call, auto-detect | English calls lose Whisper's word timestamps | regional-only volumes |
| Detect the language first, then route | every call pays for two speech-to-text passes | uploads where nobody knows the language |
| Judge the original-language text | judge accuracy on Indian scripts is unmeasured, and the phrase rules are written in English | a judge model measured on those scripts |

## Decision

We will store the uploader's choice in `calls.language` (11 languages, or `auto`, migration 0004). English calls go to Groq Whisper. The others go to Sarvam saaras:v4 through the gateway:
- in 28-second chunks, cut at the quietest point;
- with the product name sent as a keyterm.

Each regional line is translated with sarvam-translate:v1, in numbered batches under 2,000 characters, into `transcript_segments.text_en`. The judge and the phrase rules read the translation. Quotes and times still come from the original line (tenet 2).

The `sarvamai` SDK is called only inside `packages/gateway`, on the gateway's own fetch with its retries off, so the budget, rate limits, cassettes and tests apply to it unchanged. Bulbul v3 voices the two code-mixed regional seed calls.

## Consequences

- **Read-along**: regional transcripts highlight whole lines.
- **Eval gate**: it covers English and Hinglish only; the Hindi-English and Telugu-English seed calls are outside it until a judge pass on them is recorded.
- **Prices**: Sarvam's are in rupees, converted at `INR_PER_USD` in `pricing.ts`, which needs updating when the rate moves.
- **License**: the SDK's licensing must be confirmed (`license-compliance`) before release.

## Commits us to

sarvamai 1.1.12, pinned exactly; Sarvam saaras:v4, sarvam-translate:v1 and bulbul:v3; `SARVAM_API_KEY` in the environment
