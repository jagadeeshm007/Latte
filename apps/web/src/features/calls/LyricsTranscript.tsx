import type { Segment } from "@scc/shared";
import { ListIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { FullTranscript } from "./FullTranscript";
import { ReadAlong } from "./ReadAlong";

const SPEAKER = {
  agent: { label: "Agent", tone: "text-speaker-agent" },
  customer: { label: "Customer", tone: "text-speaker-customer" },
} as const;

type View = "original" | "english";

/** currentIndex is the line being spoken, or the last one started during a pause. */
function currentIndex(lines: Segment[], nowMs: number): number {
  let at = -1;
  for (const [i, s] of lines.entries()) {
    if (s.startMs <= nowMs) at = i;
    else break;
  }
  return at;
}

/**
 * LyricsTranscript reads the call like song lyrics: the line being spoken is
 * large and bright, lines already heard dim, and the panel keeps the current
 * line centred on its own. It is not scrollable by hand; "View complete
 * transcript" opens every line to scroll and jump through.
 */
export function LyricsTranscript({
  segments,
  nowMs,
  playing,
  canPlay,
  onPlay,
  timed = true,
}: {
  segments: Segment[];
  nowMs: number;
  playing: boolean;
  canPlay: boolean;
  onPlay: (ms: number) => void;
  /** false for a transcript uploaded without times (ADR-0030). */
  timed?: boolean;
}) {
  const box = useRef<HTMLOListElement>(null);
  const [view, setView] = useState<View>("original");
  const [full, setFull] = useState(false);
  const lines = segments.filter((s) => s.text.trim());
  const at = currentIndex(lines, nowMs);
  const active = lines[at];
  const speaking = active !== undefined && nowMs < active.endMs;
  const translated = lines.some((s) => s.translation);

  // Keep the current line in the middle of the panel; the panel itself never scrolls by hand.
  useEffect(() => {
    const el = box.current;
    const row = el?.querySelector<HTMLElement>(`[data-index="${String(Math.max(0, at))}"]`);
    if (!el || !row) return;
    el.scrollTop = Math.max(0, row.offsetTop - el.clientHeight / 2 + row.offsetHeight / 2);
  }, [at]);

  return (
    <section
      aria-labelledby="lyrics-heading"
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-brand/10 via-card to-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <h2 id="lyrics-heading" className="text-sm font-semibold">
          Transcript
          {playing ? (
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              following the audio
            </span>
          ) : null}
        </h2>
        {translated ? (
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Transcript language"
            value={[view]}
            onValueChange={(v: unknown[]) => {
              if (v[0] === "original" || v[0] === "english") setView(v[0]);
            }}
          >
            <ToggleGroupItem value="original" className="px-2 text-xs">
              Original
            </ToggleGroupItem>
            <ToggleGroupItem value="english" className="px-2 text-xs">
              English
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}
      </header>
      {lines.length === 0 ? (
        <p className="px-5 py-10 text-sm text-muted-foreground">No transcript yet.</p>
      ) : (
        // The fade at both edges is a mask; padding lets the first and last lines reach the centre.
        <ol
          ref={box}
          aria-label="Transcript, following the audio"
          className="relative h-72 overflow-hidden scroll-smooth [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_78%,transparent)] px-5 py-28"
        >
          {lines.map((s, i) => {
            const speaker = SPEAKER[s.channel];
            const isActive = i === at && speaking;
            const heard = i < at || (i === at && !speaking);
            const text = view === "english" ? (s.translation ?? s.text) : s.text;
            return (
              <li
                key={s.seq}
                data-index={i}
                aria-current={isActive ? "true" : undefined}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-4 py-1.5"
              >
                <span className={cn("text-xs font-semibold tracking-wide uppercase", speaker.tone)}>
                  {speaker.label}
                </span>
                {isActive && s.words.length > 0 && view === "original" ? (
                  <div className="text-xl leading-snug font-semibold sm:text-2xl">
                    <ReadAlong
                      words={s.words}
                      nowMs={nowMs}
                      onPlay={canPlay ? onPlay : undefined}
                      lowConfidence={false}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    // Lines are not tab stops; the complete transcript is the keyboard path.
                    tabIndex={-1}
                    disabled={!canPlay}
                    onClick={() => {
                      onPlay(s.startMs);
                    }}
                    className={cn(
                      "text-start leading-snug font-semibold transition-all duration-300",
                      isActive
                        ? "text-xl text-foreground sm:text-2xl"
                        : heard
                          ? "text-lg text-foreground/45"
                          : "text-lg text-muted-foreground/60",
                      canPlay && "hover:text-foreground/80",
                    )}
                  >
                    {text}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {lines.length > 0 ? (
        <footer className="flex justify-center px-5 pb-4">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setFull(true);
            }}
          >
            <ListIcon aria-hidden="true" />
            View complete transcript
          </Button>
        </footer>
      ) : null}
      <Dialog open={full} onOpenChange={setFull}>
        <DialogPopup className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete transcript</DialogTitle>
            <DialogDescription>
              Search, filter by speaker, and press any line to play the call from there.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <FullTranscript
              segments={segments}
              nowMs={nowMs}
              canPlay={canPlay}
              onPlay={onPlay}
              timed={timed}
            />
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </section>
  );
}
