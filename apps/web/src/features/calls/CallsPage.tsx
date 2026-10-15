import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { UploadIcon } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Frame } from "@/components/ui/frame";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type CallFilters, callsQuery, meQuery, queueQuery } from "@/lib/endpoints";
import { IN_PROGRESS } from "@/lib/format";

import { CallsTable } from "./CallsTable";

const VIEWS: Record<string, { label: string; filters: CallFilters }> = {
  all: { label: "All", filters: {} },
  review: { label: "Needs review", filters: { needsReview: true } },
  scored: { label: "Scored", filters: { status: "scored" } },
  failed: { label: "Failed", filters: { status: "failed" } },
};

/** S2: every call the caller may see, newest first; refreshes while any is still in the pipeline. */
export function CallsPage() {
  const me = useQuery(meQuery);
  const [view, setView] = useState("all");
  const filters = VIEWS[view]?.filters ?? {};
  const calls = useQuery({
    ...callsQuery(filters),
    refetchInterval: (q) =>
      q.state.data?.items.some((c) => IN_PROGRESS.has(c.status)) ? 4000 : false,
  });
  const canUpload = me.data?.role !== "agent";
  return (
    <>
      <PageHeader
        title="Calls"
        description={
          me.data?.role === "agent"
            ? "Your scored calls."
            : "Every uploaded call and where it is in the pipeline."
        }
        actions={
          <>
            <ToggleGroup
              variant="outline"
              size="sm"
              aria-label="Show calls"
              value={[view]}
              onValueChange={(v: unknown[]) => {
                const next = v[0];
                if (typeof next === "string") setView(next);
              }}
            >
              {Object.entries(VIEWS).map(([key, v]) => (
                <ToggleGroupItem key={key} value={key}>
                  {v.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {canUpload ? (
              <Button size="sm" render={<Link to="/upload" />}>
                <UploadIcon aria-hidden="true" />
                Upload calls
              </Button>
            ) : null}
          </>
        }
      />
      {calls.isPending ? (
        <Loading />
      ) : calls.isError ? (
        <ErrorState error={calls.error} />
      ) : calls.data.items.length === 0 ? (
        <EmptyState
          title={view === "all" ? "No calls yet" : "No calls match this view"}
          description={
            canUpload
              ? "Upload stereo recordings to get started."
              : "Calls appear here once they are scored."
          }
        />
      ) : (
        <Frame>
          <CallsTable calls={calls.data.items} showAgent={me.data?.role !== "agent"} />
        </Frame>
      )}
    </>
  );
}

/** S5: calls waiting for a QA decision, oldest first (US-01-005). */
export function QueuePage() {
  const queue = useQuery({ ...queueQuery, refetchInterval: 15_000 });
  return (
    <>
      <PageHeader
        title="Review queue"
        description="Calls with a prohibited statement, a missed mandatory item or an unscored judge."
      />
      {queue.isPending ? (
        <Loading />
      ) : queue.isError ? (
        <ErrorState error={queue.error} />
      ) : queue.data.items.length === 0 ? (
        <EmptyState title="Queue is clear" description="Nothing is waiting for review." />
      ) : (
        <Frame>
          <CallsTable calls={queue.data.items} />
        </Frame>
      )}
    </>
  );
}
