import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";

import { useHealth } from "../hooks";
import type { Health } from "../schemas";

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Unexpected error";
}

export interface HealthCardViewProps {
  status: "pending" | "error" | "success";
  data?: Health | undefined;
  errorMessage?: string | undefined;
  retrying?: boolean;
  onRetry?: () => void;
}

/**
 * HealthCardView renders one state of the API health card from props only,
 * so the design gallery (src/design) shows every state with fixtures and the
 * app renders the same component with live data.
 */
export function HealthCardView({
  status,
  data,
  errorMessage,
  retrying = false,
  onRetry,
}: HealthCardViewProps) {
  return (
    <Card aria-labelledby="health-heading">
      <CardHeader>
        <CardTitle>
          {/* CardTitle is a div; the heading keeps the card in the outline. */}
          <h2 id="health-heading">API health</h2>
        </CardTitle>
        <CardDescription>The answer from the API&apos;s /healthz endpoint.</CardDescription>
      </CardHeader>
      <CardContent role="status" aria-live="polite" className="text-sm">
        {status === "pending" && (
          <div className="space-y-2">
            <span className="sr-only">Checking the API</span>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <p className="text-destructive">{errorMessage ?? "Unexpected error"}</p>
            <Button onClick={onRetry} disabled={retrying}>
              Retry
            </Button>
          </div>
        )}
        {status === "success" && data && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{data.status}</dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-medium">{data.version ?? "unknown"}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

/** HealthCard wires the view to the live /healthz query. */
export function HealthCard() {
  const { data, status, error, refetch, isFetching } = useHealth();
  return (
    <HealthCardView
      status={status}
      data={data}
      errorMessage={status === "error" ? describeError(error) : undefined}
      retrying={isFetching}
      onRetry={() => void refetch()}
    />
  );
}
