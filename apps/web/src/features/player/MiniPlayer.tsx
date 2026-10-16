import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AudioLinesIcon, GripVerticalIcon, PauseIcon, PlayIcon, XIcon } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

import { close, setDock, toggle, usePlayer } from "./player-store";

const WIDTH = 320;
const HEIGHT = 76;
const MARGIN = 12;
const KEY_STEP = 24;
/** Movement under this many pixels is a click on the card, not a drag. */
const CLICK_SLOP = 4;

function clamp(x: number, y: number) {
  return {
    x: Math.min(Math.max(MARGIN, x), window.innerWidth - WIDTH - MARGIN),
    y: Math.min(Math.max(MARGIN, y), window.innerHeight - HEIGHT - MARGIN),
  };
}

/**
 * MiniPlayer: what is playing, anywhere in the app except that call's own
 * page. Drag it anywhere (the spot is remembered for the session); click it
 * to open the call; × stops and closes it.
 */
export function MiniPlayer() {
  const now = usePlayer((s) => s.now);
  const status = usePlayer((s) => s.status);
  const positionMs = usePlayer((s) => s.positionMs);
  const durationMs = usePlayer((s) => s.durationMs);
  const dock = usePlayer((s) => s.dock);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);
  // The drag lives in a ref: pointer events can outrun a render, so state would be stale on release.
  const start = useRef<{
    px: number;
    py: number;
    x: number;
    y: number;
    moved: boolean;
    last: { x: number; y: number } | null;
  } | null>(null);

  if (!now || pathname === `/calls/${now.callId}`) return null;

  const at = dragging ?? (dock ? clamp(dock.x, dock.y) : null);
  const progress = durationMs ? Math.min(100, (positionMs / durationMs) * 100) : 0;
  const open = () => {
    void navigate({ to: "/calls/$callId", params: { callId: now.callId } });
  };

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // Buttons inside keep their own clicks.
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    start.current = {
      px: e.clientX,
      py: e.clientY,
      x: rect.left,
      y: rect.top,
      moved: false,
      last: null,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!s.moved && Math.hypot(dx, dy) < CLICK_SLOP) return;
    s.moved = true;
    s.last = clamp(s.x + dx, s.y + dy);
    setDragging(s.last);
  }
  function onPointerUp() {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (s.moved) {
      if (s.last) setDock(s.last);
    } else {
      open();
    }
    setDragging(null);
  }

  return (
    <div
      role="region"
      aria-label="Now playing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        start.current = null;
        setDragging(null);
      }}
      className={cn(
        "fixed z-50 flex touch-none items-center gap-2 overflow-hidden rounded-2xl border bg-popover/95 p-2 pe-1.5 text-popover-foreground shadow-xl backdrop-blur select-none",
        dragging ? "cursor-grabbing" : "cursor-pointer",
        !at && "right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]",
      )}
      style={{ width: `${String(WIDTH)}px`, ...(at ? { left: at.x, top: at.y } : {}) }}
    >
      <button
        type="button"
        aria-label="Move the player (arrow keys)"
        className="flex h-10 w-4 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={(e) => {
          const delta = {
            ArrowLeft: [-KEY_STEP, 0],
            ArrowRight: [KEY_STEP, 0],
            ArrowUp: [0, -KEY_STEP],
            ArrowDown: [0, KEY_STEP],
          }[e.key];
          if (!delta) return;
          e.preventDefault();
          const rect = e.currentTarget.parentElement?.getBoundingClientRect();
          if (rect) setDock(clamp(rect.left + (delta[0] ?? 0), rect.top + (delta[1] ?? 0)));
        }}
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground [&_svg]:size-5">
        <AudioLinesIcon aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{now.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {now.subtitle} · <span className="tabular-nums">{formatClock(positionMs)}</span>
        </p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-brand" style={{ width: `${String(progress)}%` }} />
        </div>
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={status === "playing" ? "Pause" : "Play"}
        disabled={status === "loading" || status === "idle"}
        onClick={toggle}
      >
        {status === "loading" ? (
          <Spinner aria-hidden="true" className="size-4" />
        ) : status === "playing" ? (
          <PauseIcon aria-hidden="true" />
        ) : (
          <PlayIcon aria-hidden="true" />
        )}
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Close player" onClick={close}>
        <XIcon aria-hidden="true" />
      </Button>
      <span className="sr-only">Press the card to open {now.title}.</span>
    </div>
  );
}
