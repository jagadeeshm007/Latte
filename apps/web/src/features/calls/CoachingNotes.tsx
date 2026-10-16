import { ChevronDownIcon, LightbulbIcon, SparklesIcon } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** How long the analysis appears to take; the notes already come with the score. */
const ANALYSE_MS = 2400;

/**
 * AnalysingCard: the AI analysis in progress, as a shimmering outline of the
 * coaching notes to come. Calls onDone when it finishes; unmounting stops it.
 */
export function AnalysingCard({ onDone }: { onDone: () => void }) {
  // The page re-renders on every playback tick; the timer must not restart with it.
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    const timer = setTimeout(finish, ANALYSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <Frame role="status" aria-label="AI analysis" className="border-brand/30">
      <FrameHeader className="flex-row items-center gap-2 px-4 py-3">
        <SparklesIcon aria-hidden="true" className="size-4 text-brand motion-safe:animate-pulse" />
        <FrameTitle className="text-sm">AI is analysing this call</FrameTitle>
      </FrameHeader>
      <FramePanel aria-hidden="true" className="flex flex-col gap-3 px-4 py-4">
        {["w-11/12", "w-4/5", "w-2/3"].map((w) => (
          <div key={w} className="flex items-center gap-2">
            <Skeleton className="size-1.5 shrink-0 rounded-full" />
            <Skeleton className={cn("h-3.5", w)} />
          </div>
        ))}
      </FramePanel>
    </Frame>
  );
}

/** CoachingNotesCard: the coaching notes for the call, open at first and collapsible. */
export function CoachingNotesCard({ notes }: { notes: string[] }) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Frame role="region" aria-labelledby="coaching-heading" className="border-brand/30">
        <FrameHeader className="flex-row items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <LightbulbIcon aria-hidden="true" className="size-4 text-brand" />
            <FrameTitle role="heading" aria-level={2} id="coaching-heading">
              Coaching notes
            </FrameTitle>
            <Badge variant="outline">
              <SparklesIcon aria-hidden="true" />
              AI
            </Badge>
          </div>
          <CollapsibleTrigger
            aria-label={open ? "Hide coaching notes" : "Show coaching notes"}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? "Hide" : "Show"}
            <ChevronDownIcon
              aria-hidden="true"
              className={cn("size-4 transition-transform", open && "rotate-180")}
            />
          </CollapsibleTrigger>
        </FrameHeader>
        <CollapsiblePanel>
          <FramePanel className="px-4 py-3">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing to coach on in this call.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {notes.map((n) => (
                  <li key={n} className="flex gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-brand"
                    />
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </FramePanel>
        </CollapsiblePanel>
      </Frame>
    </Collapsible>
  );
}
