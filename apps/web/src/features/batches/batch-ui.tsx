import type { Batch, BatchState } from "@scc/shared";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Small pieces both batch pages share: the state badge and the progress bar.

const STATE: Record<BatchState, { label: string; variant: "info" | "success" | "error" }> = {
  processing: { label: "Processing", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  has_failures: { label: "Has failures", variant: "error" },
};

export function BatchStateBadge({ state }: { state: BatchState }) {
  return <Badge variant={STATE[state].variant}>{STATE[state].label}</Badge>;
}

/** Segments in pipeline order; each carries its count in text, so colour is never the only cue. */
const SEGMENTS = [
  { key: "scored", label: "scored", tone: "bg-success" },
  { key: "failed", label: "failed", tone: "bg-destructive" },
  { key: "processing", label: "processing", tone: "bg-info" },
  { key: "queued", label: "queued", tone: "bg-muted-foreground/40" },
] as const;

/** BatchProgress: one bar split by scored, failed, processing and queued, with the counts beside it. */
export function BatchProgress({ batch, wide = false }: { batch: Batch; wide?: boolean }) {
  const done = batch.scored + batch.failed;
  const percent = batch.total ? Math.round((done / batch.total) * 100) : 0;
  const counts = SEGMENTS.filter((s) => batch[s.key] > 0)
    .map((s) => `${String(batch[s.key])} ${s.label}`)
    .join(", ");
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", wide ? "w-full" : "w-40")}>
      <div
        role="progressbar"
        aria-label={`${batch.name}: ${String(percent)}% done`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-muted"
      >
        {SEGMENTS.map((s) =>
          batch[s.key] > 0 ? (
            <span
              key={s.key}
              className={cn("h-full", s.tone)}
              style={{ width: `${String((batch[s.key] / batch.total) * 100)}%` }}
            />
          ) : null,
        )}
      </div>
      <span className="truncate text-xs text-muted-foreground tabular-nums">
        {batch.total === 0 ? "No calls" : `${String(percent)}% · ${counts}`}
      </span>
    </div>
  );
}
