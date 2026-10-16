import type { CallStatus, FindingStatus } from "@scc/shared";
import type { ReactNode } from "react";

import {
  AppSkeleton,
  CallSkeleton,
  CardsSkeleton,
  ChartSkeleton,
  PageSkeleton,
  TableSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ApiError } from "@/lib/api";
import { FINDING_LABEL, findingTone, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

// Shared loading, empty, error and status pieces, so every screen states
// each of its states the same way (docs/design/ux-flows.md).

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Extra lines under the description: status badges, filters. */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b pb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight break-words">
            {title}
          </h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

/** Stat: one labelled number in a tile; tiles sit in a grid so a row lines up. */
export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "error" | "success" | "warning";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 shadow-xs/5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-heading text-2xl font-semibold tracking-tight tabular-nums",
          tone === "error" && "text-destructive-foreground",
          tone === "success" && "text-success-foreground",
          tone === "warning" && "text-warning-foreground",
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

const SHAPES = {
  page: PageSkeleton,
  call: CallSkeleton,
  table: TableSkeleton,
  cards: CardsSkeleton,
  chart: ChartSkeleton,
  app: AppSkeleton,
  text: TextSkeleton,
} as const;

/**
 * Loading: a shimmering skeleton shaped like what is coming, announced once
 * to screen readers by its label.
 */
export function Loading({
  label = "Loading",
  shape = "page",
}: {
  label?: string;
  shape?: keyof typeof SHAPES;
}) {
  const Shape = SHAPES[shape];
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        <Shape />
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  title = "Could not load this",
}: {
  error: unknown;
  title?: string;
}) {
  const message =
    error instanceof ApiError || error instanceof Error ? error.message : "Something went wrong.";
  return (
    <Alert variant="error" role="alert">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="rounded-xl border border-dashed py-8">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {children}
    </Empty>
  );
}

const CALL_TONE: Record<CallStatus, "success" | "warning" | "error" | "info" | "secondary"> = {
  uploaded: "secondary",
  transcribing: "info",
  transcribed: "info",
  scoring: "info",
  scored: "success",
  failed: "error",
};

export function CallStatusBadge({ status }: { status: CallStatus }) {
  return <Badge variant={CALL_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function FindingBadge({ status }: { status: FindingStatus }) {
  return <Badge variant={findingTone(status)}>{FINDING_LABEL[status]}</Badge>;
}
