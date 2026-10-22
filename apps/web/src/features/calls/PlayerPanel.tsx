import type { CallDetail } from "@scc/shared";
import { PauseIcon, PlayIcon, RotateCcwIcon, RotateCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { play, seek, setRate, skip, toggle, usePlayer } from "@/features/player/player-store";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Waveform } from "./Waveform";
import { callDurationMs } from "./waveform-bars";

const RATES = [1, 1.25, 1.5, 2] as const;
const SKIP_MS = 10_000;

/**
 * PlayerPanel: the waveform and transport for this call, on the app-wide
 * player. Play stays disabled with a spinner until the recording can play.
 */
export function PlayerPanel({
  detail,
  hoveredSeq,
  onHover,
}: {
  detail: CallDetail;
  hoveredSeq: number | null;
  onHover: (seq: number | null) => void;
}) {
  const isThis = usePlayer((s) => s.now?.callId === detail.call.id);
  const status = usePlayer((s) => (isThis ? s.status : "idle"));
  const positionMs = usePlayer((s) => (isThis ? s.positionMs : 0));
  const audioMs = usePlayer((s) => (isThis ? s.durationMs : null));
  const rate = usePlayer((s) => s.rate);
  const error = usePlayer((s) => (isThis ? s.error : null));
  const peaks = usePlayer((s) => s.peaks[detail.call.id]);
  const durationMs = callDurationMs(
    detail.segments,
    audioMs ?? detail.call.durationMs ?? undefined,
  );
  const loading = status === "loading" || status === "idle";
  const playing = status === "playing";

  return (
    <Frame role="region" aria-labelledby="recording-heading">
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
        <FrameTitle role="heading" aria-level={2} id="recording-heading">
          Recording
        </FrameTitle>
        <ul
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
          aria-label="Legend"
        >
          <Legend className="bg-speaker-agent">Agent</Legend>
          <Legend className="bg-speaker-customer">Customer</Legend>
          <Legend className="bg-destructive">Breach</Legend>
          <Legend className="bg-warning">Missed or partial</Legend>
        </ul>
      </FrameHeader>
      <FramePanel className="flex flex-col gap-4 p-4">
        {detail.audioAvailable ? (
          <>
            <Waveform
              segments={detail.segments}
              findings={detail.findings}
              durationMs={durationMs}
              nowMs={positionMs}
              peaks={peaks}
              hoveredSeq={hoveredSeq}
              onHover={onHover}
              onScrub={(ms) => {
                seek(ms);
              }}
              onSeek={(ms) => {
                seek(ms, playing);
              }}
              loading={loading}
            />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                {formatClock(positionMs)} / {formatClock(durationMs)}
              </p>
              <div className="flex items-center gap-3" role="group" aria-label="Playback">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Back 10 seconds"
                  disabled={loading}
                  onClick={() => {
                    skip(-SKIP_MS);
                  }}
                >
                  <RotateCcwIcon aria-hidden="true" />
                </Button>
                <Button
                  aria-label={loading ? "Loading audio" : playing ? "Pause" : "Play"}
                  disabled={loading}
                  onClick={status === "error" ? () => void play() : toggle}
                  size="icon-lg"
                  className="size-12 rounded-full shadow-md sm:size-12 [&_svg]:size-5 sm:[&_svg]:size-5"
                >
                  {loading ? (
                    <Spinner aria-hidden="true" />
                  ) : playing ? (
                    <PauseIcon aria-hidden="true" />
                  ) : (
                    <PlayIcon aria-hidden="true" className="translate-x-px" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Forward 10 seconds"
                  disabled={loading}
                  onClick={() => {
                    skip(SKIP_MS);
                  }}
                >
                  <RotateCwIcon aria-hidden="true" />
                </Button>
              </div>
              <ToggleGroup
                variant="outline"
                size="sm"
                aria-label="Playback speed"
                className="justify-self-end"
                value={[String(rate)]}
                onValueChange={(v: unknown[]) => {
                  const next = RATES.find((r) => String(r) === v[0]);
                  if (next) setRate(next);
                }}
              >
                {RATES.map((r) => (
                  <ToggleGroupItem key={r} value={String(r)} className="px-2 font-mono text-xs">
                    {r}×
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <p
              role="status"
              className={cn(
                "text-center text-xs",
                error ? "text-destructive" : "text-muted-foreground",
                !loading && !error && "sr-only",
              )}
            >
              {error ?? (loading ? "Loading audio…" : "Ready")}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {detail.call.input === "transcript"
              ? `Uploaded as a transcript, so there is no recording to play.${detail.call.timed ? "" : " Its lines have no times; findings point to line numbers."}`
              : "The recording was deleted after its retention period. The transcript and findings remain."}
          </p>
        )}
      </FramePanel>
    </Frame>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`size-2 rounded-full ${className}`} />
      {children}
    </li>
  );
}
