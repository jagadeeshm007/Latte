import type { Segment } from "@scc/shared";
import { CrosshairIcon, PlayIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

const SPEAKER = {
  agent: {
    label: "Agent",
    dot: "bg-speaker-agent",
    text: "text-speaker-agent",
  },
  customer: {
    label: "Customer",
    dot: "bg-speaker-customer",
    text: "text-speaker-customer",
  },
} as const;

type Who = "all" | "agent" | "customer";

/** highlight marks every match of `query` in `text`, as text nodes and <mark>s (never HTML). */
function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const out: ReactNode[] = [];
  let from = 0;
  for (let at = lower.indexOf(q); at >= 0; at = lower.indexOf(q, from)) {
    out.push(text.slice(from, at));
    out.push(
      <mark key={at} className="rounded-sm bg-warning/30 px-0.5 text-foreground">
        {text.slice(at, at + q.length)}
      </mark>,
    );
    from = at + q.length;
  }
  out.push(text.slice(from));
  return out;
}

/** scrollToCurrent brings the line being played to the upper third of the list. */
function scrollToCurrent(box: HTMLOListElement | null) {
  const row = box?.querySelector<HTMLElement>('[aria-current="true"]');
  if (box && row) box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight / 3);
}

/**
 * FullTranscript: every line of the call to read at your own pace. Search
 * marks the words found, the speaker filter narrows the lines, pressing a line
 * plays from it, and "Jump to now" brings back the line being played.
 */
export function FullTranscript({
  segments,
  nowMs,
  canPlay,
  onPlay,
}: {
  segments: Segment[];
  nowMs: number;
  canPlay: boolean;
  onPlay: (ms: number) => void;
}) {
  const list = useRef<HTMLOListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [who, setWho] = useState<Who>("all");
  const [english, setEnglish] = useState(false);
  const lines = segments.filter((s) => s.text.trim());
  const translated = lines.some((s) => s.translation);
  const q = query.trim();
  const textOf = (s: Segment) => (english ? (s.translation ?? s.text) : s.text);
  // A search matches what is on screen: the line and, in the original view, its translation.
  const matches = (s: Segment) =>
    [textOf(s), english ? null : s.translation].some((t) =>
      t?.toLowerCase().includes(q.toLowerCase()),
    );
  const shown = lines.filter((s) => (who === "all" || s.channel === who) && (!q || matches(s)));
  const activeSeq = lines.find((s) => nowMs >= s.startMs && nowMs < s.endMs)?.seq ?? null;
  const activeShown = shown.some((s) => s.seq === activeSeq);
  const status = q
    ? shown.length === 0
      ? "No line has these words."
      : `${String(shown.length)} line${shown.length === 1 ? "" : "s"} found`
    : who === "all"
      ? null
      : shown.length === 0
        ? `The ${who} says nothing in this call.`
        : `${String(shown.length)} ${who} line${shown.length === 1 ? "" : "s"}`;
  const clearSearch = () => {
    setQuery("");
    search.current?.focus();
  };
  const lastMs = lines.at(-1)?.endMs ?? 0;

  const jumpToNow = () => {
    scrollToCurrent(list.current);
  };
  // Open on the line being played, so the reader starts where they are.
  useEffect(() => {
    scrollToCurrent(list.current);
  }, []);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <p className="tabular-nums">
          {lines.length} lines · {formatClock(lastMs)} ·{" "}
          {lines.filter((s) => s.channel === "agent").length} agent,{" "}
          {lines.filter((s) => s.channel === "customer").length} customer
        </p>
        <p role="status" className="font-medium text-foreground">
          {status}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-48 flex-1">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            ref={search}
            size="sm"
            type="search"
            aria-label="Search the transcript"
            placeholder="Search words in the call"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              // Escape empties the search first; only an empty search lets it close the dialog.
              if (e.key === "Escape" && query) {
                e.preventDefault();
                e.stopPropagation();
                setQuery("");
              }
            }}
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Clear search"
                onClick={clearSearch}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
        <ToggleGroup
          variant="outline"
          size="sm"
          aria-label="Speaker"
          value={[who]}
          onValueChange={(v: unknown[]) => {
            if (v[0] === "all" || v[0] === "agent" || v[0] === "customer") setWho(v[0]);
          }}
        >
          <ToggleGroupItem value="all">Both</ToggleGroupItem>
          <ToggleGroupItem value="agent">Agent</ToggleGroupItem>
          <ToggleGroupItem value="customer">Customer</ToggleGroupItem>
        </ToggleGroup>
        {translated ? (
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Language"
            value={[english ? "english" : "original"]}
            onValueChange={(v: unknown[]) => {
              setEnglish(v[0] === "english");
            }}
          >
            <ToggleGroupItem value="original">Original</ToggleGroupItem>
            <ToggleGroupItem value="english">English</ToggleGroupItem>
          </ToggleGroup>
        ) : null}
        {activeShown ? (
          <Button size="sm" variant="ghost" onClick={jumpToNow}>
            <CrosshairIcon aria-hidden="true" />
            Jump to now
          </Button>
        ) : null}
      </div>
      {/* Tall enough to read, short enough that the dialog never runs off the screen. */}
      <ol
        ref={list}
        aria-label="Complete transcript"
        className="relative -mx-2 flex max-h-[60svh] flex-col divide-y divide-border/60 overflow-y-auto scroll-smooth border-t px-2 pt-1"
      >
        {shown.map((s) => {
          const speaker = SPEAKER[s.channel];
          const stamp = formatClock(s.startMs);
          const active = s.seq === activeSeq;
          const heard = !active && s.endMs <= nowMs;
          return (
            <li
              key={s.seq}
              aria-current={active ? "true" : undefined}
              data-heard={heard ? "true" : undefined}
              className="py-0.5"
            >
              <button
                type="button"
                disabled={!canPlay}
                aria-label={`Play ${speaker.label.toLowerCase()} line at ${stamp}: ${textOf(s)}`}
                onClick={() => {
                  onPlay(s.startMs);
                }}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                  active ? "bg-brand/10" : "hover:bg-muted/70",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums transition-colors",
                    active
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background",
                  )}
                >
                  <PlayIcon aria-hidden="true" className="size-3 fill-current" />
                  {stamp}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <span className={cn("flex items-center gap-1.5", speaker.text)}>
                      <span
                        aria-hidden="true"
                        className={cn("size-1.5 rounded-full", speaker.dot)}
                      />
                      {speaker.label}
                    </span>
                    {active ? (
                      <span className="rounded-full bg-brand/15 px-1.5 py-px font-medium text-brand">
                        Now
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-sm leading-relaxed",
                      active
                        ? "font-medium text-foreground"
                        : heard
                          ? "text-muted-foreground"
                          : "text-foreground/90",
                    )}
                  >
                    {highlight(textOf(s), q)}
                  </span>
                  {!english && s.translation ? (
                    <span lang="en" className="text-xs leading-relaxed text-muted-foreground">
                      {highlight(s.translation, q)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
