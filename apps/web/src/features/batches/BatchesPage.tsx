import { BATCH_STATES, type BatchState } from "@scc/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArchiveIcon, SearchIcon, UploadIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { PageNav } from "@/components/PageNav";
import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel } from "@/components/ui/frame";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SavedViewsMenu } from "@/features/views/SavedViewsMenu";
import { batchesQuery } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";

import { BatchProgress, BatchStateBadge } from "./batch-ui";

// Batches: every upload of calls as one unit, with its progress through the
// pipeline and its results (ADR-0017). Refreshes itself while any batch runs.

const PAGE_SIZE = 20;
/** A saved view's filters, each parsed on its own so one stale value drops only itself. */
const batchViewSchema = z.object({
  q: z.string().max(100).optional().catch(undefined),
  state: z.enum(BATCH_STATES).optional().catch(undefined),
  archived: z.boolean().optional().catch(undefined),
});
const SEARCH_DELAY_MS = 300;
const REFRESH_MS = 5000;
const STATE_LABEL: Record<BatchState | "all", string> = {
  all: "All",
  processing: "Processing",
  completed: "Completed",
  has_failures: "Has failures",
};

export function BatchesPage() {
  const [text, setText] = useState("");
  const [q, setQ] = useState<string | undefined>(undefined);
  const [state, setState] = useState<BatchState | undefined>(undefined);
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const list = useQuery({
    ...batchesQuery({ q, state, archived, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.items.some((b) => b.state === "processing") ? REFRESH_MS : false,
  });

  // Typing settles before it becomes a request.
  useEffect(() => {
    const next = text.trim() || undefined;
    if (next === q) return;
    const timer = setTimeout(() => {
      setQ(next);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, q]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Batches"
        description="Calls uploaded together, by people in the app or through the API."
        actions={
          <>
            <SavedViewsMenu
              page="batches"
              current={{ q, state, archived: archived || undefined }}
              onApply={(view) => {
                const next = batchViewSchema.parse(view);
                setText(next.q ?? "");
                setQ(next.q);
                setState(next.state);
                setArchived(next.archived ?? false);
                setPage(1);
              }}
            />
            <Link to="/upload" className={buttonVariants({ size: "sm" })}>
              <UploadIcon aria-hidden="true" />
              Upload a batch
            </Link>
          </>
        }
      />
      <Frame>
        <FrameHeader className="flex-row flex-wrap items-center gap-2 px-4 py-3">
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              size="sm"
              type="search"
              aria-label="Search batches"
              placeholder="Search batches"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
              }}
            />
          </InputGroup>
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="State"
            value={[state ?? "all"]}
            onValueChange={(v: unknown[]) => {
              const next = BATCH_STATES.find((s) => s === v[0]);
              setState(next);
              setPage(1);
            }}
          >
            {(["all", ...BATCH_STATES] as const).map((s) => (
              <ToggleGroupItem key={s} value={s}>
                {STATE_LABEL[s]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Toggle
            variant="outline"
            size="sm"
            aria-label="Show archived batches"
            className="sm:ms-auto"
            pressed={archived}
            onPressedChange={(pressed) => {
              setArchived(pressed);
              setPage(1);
            }}
          >
            <ArchiveIcon aria-hidden="true" />
            Archived
          </Toggle>
        </FrameHeader>
        <FramePanel className="p-0">
          {list.isPending ? (
            <Loading label="Loading batches" shape="table" />
          ) : list.isError ? (
            <div className="p-4">
              <ErrorState error={list.error} />
            </div>
          ) : list.data.items.length === 0 ? (
            <EmptyState
              title={q || state || archived ? "No batch matches" : "No batches yet"}
              description={
                q || state || archived
                  ? "Try another search or filter."
                  : "Upload recordings and they arrive here as a batch."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table aria-label="Batches">
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-end">Calls</TableHead>
                    <TableHead className="text-end">Avg score</TableHead>
                    <TableHead className="text-end">Flagged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.items.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-72">
                        <Link
                          to="/batches/$batchId"
                          params={{ batchId: b.id }}
                          className="block truncate font-medium underline-offset-4 hover:underline"
                        >
                          {b.name}
                        </Link>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {formatDate(b.createdAt.slice(0, 10))} · {b.createdByName}
                          {b.source === "api" ? <Badge variant="outline">API</Badge> : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <BatchStateBadge state={b.state} />
                      </TableCell>
                      <TableCell>
                        <BatchProgress batch={b} />
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{b.total}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {b.avgScore === null ? "None" : `${b.avgScore.toFixed(1)}%`}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{b.flagged}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </FramePanel>
        {list.data && list.data.total > PAGE_SIZE ? (
          <div className="border-t px-4 py-3">
            <PageNav
              page={page}
              pageSize={PAGE_SIZE}
              total={list.data.total}
              label="batches"
              onPage={setPage}
            />
          </div>
        ) : null}
      </Frame>
    </div>
  );
}
