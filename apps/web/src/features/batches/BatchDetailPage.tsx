import { MAX_ZIP_CALLS, type BatchDetail, type BatchExportPart } from "@scc/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  DownloadIcon,
  EllipsisIcon,
  FileArchiveIcon,
  FileSpreadsheetIcon,
  PencilIcon,
  RotateCwIcon,
} from "lucide-react";
import { useState } from "react";

import { PageNav } from "@/components/PageNav";
import { ErrorState, Loading, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { CallsTable } from "@/features/calls/CallsTable";
import { saveFile } from "@/lib/download";
import { api, batchQuery, callsQuery, meQuery } from "@/lib/endpoints";
import { formatClock, formatDate } from "@/lib/format";

import { BatchProgress, BatchStateBadge } from "./batch-ui";

// One batch: where its calls stand, its results, its calls, and the actions
// on all of them at once: rename, retry the failed, archive and download.

const PAGE_SIZE = 20;
const REFRESH_MS = 5000;

export function BatchDetailPage({ batchId }: { batchId: string }) {
  const batch = useQuery({
    ...batchQuery(batchId),
    refetchInterval: (q) => (q.state.data?.state === "processing" ? REFRESH_MS : false),
  });
  if (batch.isPending) return <Loading label="Loading the batch" />;
  if (batch.isError) return <ErrorState error={batch.error} title="Could not open this batch" />;
  return <BatchView batch={batch.data} />;
}

function BatchView({ batch }: { batch: BatchDetail }) {
  const me = useQuery(meQuery);
  const [page, setPage] = useState(1);
  const calls = useQuery({
    ...callsQuery({ batchId: batch.id, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    refetchInterval: batch.state === "processing" ? REFRESH_MS : false,
  });
  const stats: [string, string][] = [
    ["Calls", String(batch.total)],
    ["Scored", String(batch.scored)],
    ["Failed", String(batch.failed)],
    ["Flagged", String(batch.flagged)],
    ["Avg score", batch.avgScore === null ? "None" : `${batch.avgScore.toFixed(1)}%`],
    ["Breaches", String(batch.breaches)],
    ["Audio", formatClock(batch.audioMs)],
    ["Model spend", `$${batch.costUsd.toFixed(4)}`],
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={batch.name}
        description={`Started ${formatDate(batch.createdAt.slice(0, 10))} by ${batch.createdByName}${batch.source === "api" ? " through the API" : ""}`}
        actions={
          <>
            <ExportMenu batch={batch} />
            <BatchActions
              batch={batch}
              canChange={me.data?.id === batch.createdBy || me.data?.role === "manager"}
            />
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Batch status">
          <BatchStateBadge state={batch.state} />
          {batch.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
        </div>
      </PageHeader>
      <Frame>
        <FramePanel className="flex flex-col gap-4 px-4 py-4">
          <BatchProgress batch={batch} wide />
          <dl
            aria-label="Batch summary"
            className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-8"
          >
            {stats.map(([term, value]) => (
              <div key={term}>
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd className="text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </FramePanel>
      </Frame>
      <Frame role="region" aria-labelledby="batch-calls-heading">
        <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
          <FrameTitle role="heading" aria-level={2} id="batch-calls-heading">
            Calls in this batch
          </FrameTitle>
          <Link
            to="/calls"
            search={{ batchId: batch.id }}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Open in Calls, to filter and group
          </Link>
        </FrameHeader>
        <FramePanel className="p-0">
          {calls.isPending ? (
            <Loading label="Loading calls" shape="table" />
          ) : calls.isError ? (
            <div className="p-4">
              <ErrorState error={calls.error} />
            </div>
          ) : calls.data.items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No calls in this batch.</p>
          ) : (
            <CallsTable calls={calls.data.items} role={me.data?.role} />
          )}
        </FramePanel>
        {calls.data && calls.data.total > PAGE_SIZE ? (
          <div className="border-t px-4 py-3">
            <PageNav
              page={page}
              pageSize={PAGE_SIZE}
              total={calls.data.total}
              label="calls"
              onPage={setPage}
            />
          </div>
        ) : null}
      </Frame>
    </div>
  );
}

/** ExportMenu: the results as CSV, or a ZIP with transcripts and, optionally, the recordings. */
function ExportMenu({ batch }: { batch: BatchDetail }) {
  const [busy, setBusy] = useState(false);
  const tooBig = batch.total > MAX_ZIP_CALLS;

  async function download(format: "csv" | "zip", include: BatchExportPart[] = []) {
    setBusy(true);
    try {
      // The API signs a five-minute link, so the browser streams the file straight to disk.
      saveFile(await api.batchExportLink(batch.id, format, include), "");
    } catch (e) {
      toastManager.add({
        type: "error",
        title: "Could not start the download",
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Menu>
      <MenuTrigger
        render={<Button variant="outline" size="sm" loading={busy} disabled={batch.total === 0} />}
      >
        <DownloadIcon aria-hidden="true" />
        Download
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuItem
          onClick={() => {
            void download("csv");
          }}
        >
          <FileSpreadsheetIcon aria-hidden="true" />
          Results (CSV)
        </MenuItem>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>
            {tooBig ? `ZIP: up to ${String(MAX_ZIP_CALLS)} calls` : "ZIP with results"}
          </MenuGroupLabel>
          <MenuItem
            disabled={tooBig}
            onClick={() => {
              void download("zip", ["transcripts"]);
            }}
          >
            <FileArchiveIcon aria-hidden="true" />
            Results and transcripts
          </MenuItem>
          <MenuItem
            disabled={tooBig}
            onClick={() => {
              void download("zip", ["transcripts", "audio"]);
            }}
          >
            <FileArchiveIcon aria-hidden="true" />
            Everything, with recordings
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

/** BatchActions: rename, retry the failed calls, archive or restore. */
function BatchActions({ batch, canChange }: { batch: BatchDetail; canChange: boolean }) {
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(batch.name);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["batches"] }),
      queryClient.invalidateQueries({ queryKey: ["calls"] }),
    ]);
  const fail = (e: Error) =>
    toastManager.add({ type: "error", title: "That did not work", description: e.message });
  const update = useMutation({
    mutationFn: (patch: { name?: string; archived?: boolean }) => api.updateBatch(batch.id, patch),
    onSuccess: async (_, patch) => {
      toastManager.add({
        type: "success",
        title:
          patch.name !== undefined
            ? "Batch renamed"
            : patch.archived
              ? "Batch archived"
              : "Batch restored",
      });
      setRenaming(false);
      await refresh();
    },
    onError: fail,
  });
  const retry = useMutation({
    mutationFn: () => api.retryBatch(batch.id),
    onSuccess: async ({ queued }) => {
      toastManager.add({
        type: "success",
        title: `${String(queued)} call${queued === 1 ? "" : "s"} queued again`,
      });
      await refresh();
    },
    onError: fail,
  });

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${batch.name}`} />
          }
        >
          <EllipsisIcon aria-hidden="true" />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuItem
            disabled={batch.failed === 0 || retry.isPending}
            onClick={() => {
              retry.mutate();
            }}
          >
            <RotateCwIcon aria-hidden="true" />
            Retry failed calls
          </MenuItem>
          {canChange ? (
            <>
              <MenuItem
                onClick={() => {
                  setName(batch.name);
                  setRenaming(true);
                }}
              >
                <PencilIcon aria-hidden="true" />
                Rename
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                onClick={() => {
                  update.mutate({ archived: batch.archivedAt === null });
                }}
              >
                {batch.archivedAt ? (
                  <ArchiveRestoreIcon aria-hidden="true" />
                ) : (
                  <ArchiveIcon aria-hidden="true" />
                )}
                {batch.archivedAt ? "Unarchive" : "Archive"}
              </MenuItem>
            </>
          ) : null}
        </MenuPopup>
      </Menu>
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogPopup>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) update.mutate({ name: name.trim() });
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename batch</DialogTitle>
              <DialogDescription>
                A name people will recognise in lists and exports.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel>
              <Input
                aria-label="Batch name"
                value={name}
                maxLength={120}
                required
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" type="button" />}>Cancel</DialogClose>
              <Button type="submit" loading={update.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </>
  );
}
