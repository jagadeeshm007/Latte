# ADR-0011: Use the audio/ui waveform for the call player

- Status: Accepted
- Date: 2026-10-15
- Task: SCC-1
- Deciders: engineering (requested by the product owner)
- Area: web ui
- Reversibility: cheap: only apps/web/src/features/calls/Waveform.tsx uses the registry component

## Context

The call page needs a seekable waveform that colours each stretch by speaker, highlights the hovered segment, marks each cited finding and works from the keyboard. A hand-built strip did this with a `role="slider"` div. The product owner asked to use audio/ui for the audio controls.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| The `@audio-ui/waveform` registry component (canvas waveform, `WaveformRegion`, `WaveformMarker`, `WaveformHover`), installed with the shadcn CLI into src/components/audio-ui, with its `waveform-dsp` helpers in src/lib (chosen) | it draws the bars in one colour, so speakers are shown as tinted regions and a lane under the strip instead of coloured bars; a young package (0.x) | a styled seek bar we can extend without owning the drawing |
| `@audio-ui/react` headless primitives (`Waveform.Bars`, `Waveform.Bar`) styled by hand | per-bar colour, but we would own the styling the registry already ships | a player whose bars themselves must change colour |
| Keep the hand-built strip | we maintain seeking, focus and keyboard ourselves instead of a native range input | no new dependency at all |

## Decision

We will draw the call waveform with the audio/ui registry Waveform, on `@audio-ui/react` pinned to an exact version. Until the recording is decoded, `waveform-bars.ts` draws an envelope from the segment timings; after, `waveform-dsp` measures min/max peaks. Transport controls stay coss ui buttons. Registry output (src/components/audio-ui, src/lib/waveform-dsp.ts) is regenerated with the CLI, never hand-edited, and is excluded from lint and coverage like src/components/ui.

## Consequences

Seeking, focus and keyboard (arrows, Page keys, Home, End) come from the primitive's native range input. Both packages were inside the workspace minimum release age (24 hours) when added; no exclusion was added, so installs pass once they age out (2026-10-15 17:33 UTC). Upgrades are deliberate: read the changelog before moving off the pinned version, because 0.x minors may break.

## Commits us to

@audio-ui/react 0.2.2 (MIT), with its one dependency @audio-ui/core 0.1.2
