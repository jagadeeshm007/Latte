import type { CallStatus, FindingStatus } from "@scc/shared";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import { FINDING_LABEL, findingTone, STATUS_LABEL } from "@/lib/format";

// Shared loading, empty, error and status pieces, so every screen states
// each of its states the same way (docs/design/ux-flows.md).

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2 py-8 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Spinner aria-hidden="true" className="size-4" />
      <span>{label}</span>
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
