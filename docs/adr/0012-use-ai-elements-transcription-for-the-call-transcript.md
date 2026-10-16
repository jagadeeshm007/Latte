# ADR-0012: Use AI Elements Transcription for the call transcript

- Status: Accepted
- Date: 2026-10-15
- Task: SCC-1
- Deciders: engineering (requested by the product owner)
- Area: web ui
- Reversibility: cheap: only apps/web/src/features/calls/Transcript.tsx uses the component

## Context

The call transcript must follow the recording: the line being spoken stands out, lines already heard and still to come read differently, and pressing a line plays from it. The product owner asked for the AI Elements Transcription component.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| AI Elements `transcription` installed from its registry as published, with `ai` and `@radix-ui/react-use-controllable-state` (chosen) | `ai` is the Vercel AI SDK, with @ai-sdk/gateway, @ai-sdk/provider, @ai-sdk/provider-utils, @vercel/oidc and @workflow/serde, pulled in for one type import | following upstream updates by regenerating |
| Copy the component into the app, typed from our Segment schema | not regenerable from the registry | no new dependencies |

## Decision

We will render the transcript with AI Elements' `Transcription` and `TranscriptionSegment` from src/components/ai-elements, fed our segments in seconds and the player's clock, with its seek routed to the player. `ai` is used for types only: model calls still go only through packages/gateway, and nothing in apps/web may import a runtime value from `ai` or `@ai-sdk/*`.

## Consequences

The component marks the playing line with `data-active`; our rows keep the speaker edge, the shared hover with the waveform and keeping the line in view. Registry output is regenerated with the CLI and excluded from lint and coverage like src/components/ui.

## Commits us to

ai 7.0.140 (Apache-2.0) and @radix-ui/react-use-controllable-state 1.3.0 (MIT), pinned exactly
