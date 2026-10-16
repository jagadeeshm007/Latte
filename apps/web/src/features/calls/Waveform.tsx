import type { Finding, Segment } from "@scc/shared";
import type { PointerEvent } from "react";

import {
  Waveform as AudioWaveform,
  WaveformHover,
  WaveformMarker,
  WaveformRegion,
} from "@/components/audio-ui/waveform";
import { findingTone, formatClock, type Tone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AudioPeaks } from "@/lib/waveform-dsp";

import { BAR_COUNT, buildBars, segmentAt } from "./waveform-bars";

const SPEAKER = {
  agent: { lane: "bg-speaker-agent", tint: "bg-speaker-agent/10", hot: "bg-speaker-agent/25" },
  customer: {
    lane: "bg-speaker-customer",
    tint: "bg-speaker-customer/10",
    hot: "bg-speaker-customer/25",
  },
} as const;

const MARKER: Record<Tone, string> = {
  error: "bg-destructive",
  warning: "bg-warning",
  success: "bg-success",
  info: "bg-info",
  secondary: "bg-muted-foreground",
};

interface WaveformProps {
  segments: Segment[];
  findings: Finding[];
  durationMs: number;
  nowMs: number;
  /** Measured min/max peaks once the recording is decoded. */
  peaks: AudioPeaks | undefined;
  hoveredSeq: number | null;
  onHover: (seq: number | null) => void;
  /** While dragging: cheap moves of a loaded recording. */
  onScrub: (ms: number) => void;
  /** When a press, drag or key press ends: may load the recording. */
  onSeek: (ms: number) => void;
  /** The recording is still on its way: the bars sweep and seeking waits. */
  loading?: boolean;
}

/**
 * Waveform: the call on audio/ui's registry waveform. Each segment is a
 * region tinted in its speaker's colour, with a speaker lane under the strip;
 * the hovered one deepens and is named above. Findings are markers, and the
 * component's native range input takes focus and the keyboard.
 */
export function Waveform(props: WaveformProps) {
  const { segments, findings, durationMs, nowMs, peaks, hoveredSeq, onHover } = props;
  if (durationMs <= 0) return null;
  const values = peaks ?? buildBars(segments, durationMs, BAR_COUNT).map((b) => b.amp);
  const hovered = segments.find((s) => s.seq === hoveredSeq);
  const pct = (ms: number) => `${String((ms / durationMs) * 100)}%`;
  const msAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - rect.left) / Math.max(1, rect.width)) * durationMs;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <AudioWaveform
          aria-label="Seek in the recording"
          values={values}
          duration={durationMs / 1000}
          value={nowMs / 1000}
          step={5}
          largeStep={30}
          variant="playhead"
          loading={props.loading ?? false}
          getAriaValueText={(v, d) => `${formatClock(v * 1000)} of ${formatClock(d * 1000)}`}
          onValueChange={(v) => {
            props.onScrub(v * 1000);
          }}
          onValueCommitted={(v) => {
            props.onSeek(v * 1000);
          }}
          onPointerMove={(e) => {
            onHover(segmentAt(segments, msAt(e))?.seq ?? null);
          }}
          onPointerLeave={() => {
            onHover(null);
          }}
        >
          {segments.map((s) => (
            <WaveformRegion
              key={s.seq}
              value={[s.startMs / 1000, s.endMs / 1000]}
              movable={false}
              disabled
              aria-hidden="true"
              data-speaker={s.channel}
              className={cn(
                "rounded-sm ring-0 transition-colors",
                s.seq === hoveredSeq ? SPEAKER[s.channel].hot : SPEAKER[s.channel].tint,
              )}
            />
          ))}
          {findings.map((f) =>
            f.startMs === null ? null : (
              <WaveformMarker
                key={f.id}
                value={f.startMs / 1000}
                aria-hidden="true"
                className={cn("w-0.5", MARKER[findingTone(f.status)])}
              />
            ),
          )}
          <WaveformHover format={(v) => formatClock(v * 1000)} />
        </AudioWaveform>
        {hovered ? (
          <SegmentCard segment={hovered} left={pct((hovered.startMs + hovered.endMs) / 2)} />
        ) : null}
      </div>
      {/* Who speaks when, in full colour; the regions above carry the same colours faintly. */}
      <div aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        {segments.map((s) => (
          <span
            key={s.seq}
            className={cn(
              "absolute inset-y-0 transition-opacity",
              SPEAKER[s.channel].lane,
              hoveredSeq !== null && s.seq !== hoveredSeq && "opacity-40",
            )}
            style={{ left: pct(s.startMs), width: pct(s.endMs - s.startMs) }}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
        <span>{formatClock(0)}</span>
        <span>{formatClock(durationMs)}</span>
      </div>
    </div>
  );
}

/** SegmentCard names the hovered segment above the strip, from the waveform or the transcript. */
function SegmentCard({ segment: s, left }: { segment: Segment; left: string }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full z-10 mb-2 w-64 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
      // Keep the card inside the strip near either end.
      style={{ left: `clamp(8rem, ${left}, calc(100% - 8rem))` }}
    >
      <div className="mb-1 flex items-center gap-1.5 font-medium">
        <span aria-hidden="true" className={cn("size-2 rounded-full", SPEAKER[s.channel].lane)} />
        {s.channel === "agent" ? "Agent" : "Customer"}
        <span className="ms-auto font-mono font-normal text-muted-foreground tabular-nums">
          {formatClock(s.startMs)} to {formatClock(s.endMs)}
        </span>
      </div>
      <p className="line-clamp-2 text-muted-foreground">{s.text}</p>
    </div>
  );
}
