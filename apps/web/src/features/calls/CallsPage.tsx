import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { UploadIcon } from "lucide-react";
import { useState } from "react";

import { PageNav } from "@/components/PageNav";
import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Frame, FramePanel } from "@/components/ui/frame";
import { callsQuery, meQuery, queueQuery, referenceQuery } from "@/lib/endpoints";
import { IN_PROGRESS } from "@/lib/format";

import { applyLocally, type CallsSearch, hasFilters, PAGE_SIZE, toFilters } from "./calls-search";
import { CallsTable } from "./CallsTable";
import { CallsToolbar } from "./CallsToolbar";

/**
 * S2: every call the caller may see, newest first, one page at a time, with
 * search, filters and grouping kept in the URL (the route passes them in).
 * Refreshes while any call on the page is still in the pipeline.
 */
export function CallsPage({
  search,
  onSearch,
}: {
  search: CallsSearch;
  onSearch: (next: CallsSearch) => void;
}) {
  const me = useQuery(meQuery);
  const isAgent = me.data?.role === "agent";
  // Agents have no reference lists: they filter by status, flag and language only.
  const reference = useQuery({ ...referenceQuery, enabled: me.data !== undefined && !isAgent });
  const calls = useQuery({
    ...callsQuery(toFilters(search)),
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      q.state.data?.items.some((c) => IN_PROGRESS.has(c.status)) ? 4000 : false,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calls"
        description={
          isAgent ? "Your scored calls." : "Every uploaded call and where it is in the pipeline."
        }
        actions={
          !isAgent && me.data ? (
            <Button size="sm" render={<Link to="/upload" />}>
              <UploadIcon aria-hidden="true" />
              Upload calls
            </Button>
          ) : null
        }
      />
      <Frame>
        <CallsToolbar search={search} onChange={onSearch} reference={reference.data} />
        <FramePanel className="p-0">
          {calls.isPending ? (
            <Loading label="Loading calls" shape="table" />
          ) : calls.isError ? (
            <div className="p-4">
              <ErrorState error={calls.error} />
            </div>
          ) : calls.data.items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={hasFilters(search) ? "No calls match" : "No calls yet"}
                description={
                  hasFilters(search)
                    ? "Change the search or clear the filters."
                    : isAgent
                      ? "Calls appear here once they are scored."
                      : "Upload stereo recordings to get started."
                }
              />
            </div>
          ) : (
            <>
              <CallsTable
                calls={calls.data.items}
                showAgent={!isAgent}
                groupBy={search.groupBy}
                role={me.data?.role}
              />
              <PageNav
                page={search.page ?? 1}
                pageSize={PAGE_SIZE}
                total={calls.data.total}
                label="Call pages"
                onPage={(page) => {
                  onSearch({ ...search, page });
                }}
              />
            </>
          )}
        </FramePanel>
      </Frame>
    </div>
  );
}

/** S5: calls waiting for a QA decision, oldest first (US-01-005), searched and paged in the browser. */
export function QueuePage() {
  const me = useQuery(meQuery);
  const reference = useQuery(referenceQuery);
  const queue = useQuery({ ...queueQuery, refetchInterval: 15_000 });
  const [search, setSearch] = useState<CallsSearch>({});
  const shown = queue.data ? applyLocally(queue.data.items, search) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Review queue"
        description="Calls with a prohibited statement, a missed mandatory item or an unscored judge."
      />
      <Frame>
        <CallsToolbar search={search} onChange={setSearch} reference={reference.data} local />
        <FramePanel className="p-0">
          {queue.isPending ? (
            <Loading label="Loading calls" shape="table" />
          ) : queue.isError ? (
            <div className="p-4">
              <ErrorState error={queue.error} />
            </div>
          ) : !shown || shown.items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={hasFilters(search) ? "No calls match" : "Queue is clear"}
                description={
                  hasFilters(search)
                    ? "Change the search or clear the filters."
                    : "Nothing is waiting for review."
                }
              />
            </div>
          ) : (
            <>
              <CallsTable calls={shown.items} groupBy={search.groupBy} role={me.data?.role} />
              <PageNav
                page={search.page ?? 1}
                pageSize={PAGE_SIZE}
                total={shown.total}
                label="Queue pages"
                onPage={(page) => {
                  setSearch({ ...search, page });
                }}
              />
            </>
          )}
        </FramePanel>
      </Frame>
    </div>
  );
}
