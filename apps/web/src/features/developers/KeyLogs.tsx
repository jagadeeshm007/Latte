import { API_BUCKETS } from "@scc/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { PageNav } from "@/components/PageNav";
import { ErrorState, Loading } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiKeyLogsQuery, type ApiKeyLogFilters } from "@/lib/endpoints";

import { BUCKET_LABEL } from "./key-labels";

// A key's request log, newest first, filtered by status class and bucket (ADR-0018).

const LOG_PAGE = 25;
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "2xx", label: "2xx" },
  { value: "4xx", label: "4xx" },
  { value: "429", label: "429" },
  { value: "5xx", label: "5xx" },
] as const;

/** KeyLogs: every request the key made in the last 30 days. */
export function KeyLogs({ keyId }: { keyId: string }) {
  const [filters, setFilters] = useState<ApiKeyLogFilters>({ page: 1, limit: LOG_PAGE });
  const logs = useQuery({ ...apiKeyLogsQuery(keyId, filters), placeholderData: keepPreviousData });
  return (
    <Frame role="region" aria-labelledby="logs-heading">
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
        <FrameTitle role="heading" aria-level={2} id="logs-heading">
          Request log
        </FrameTitle>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Status"
            value={[filters.status ?? "all"]}
            onValueChange={(v: unknown[]) => {
              const next = STATUS_FILTERS.find((f) => f.value === v[0]);
              setFilters((f) => ({
                ...f,
                page: 1,
                status: next && next.value !== "all" ? next.value : undefined,
              }));
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <ToggleGroupItem key={f.value} value={f.value}>
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <OptionSelect
            size="sm"
            label="Bucket"
            className="w-40"
            value={filters.bucket ?? "all"}
            options={[
              { value: "all", label: "Every bucket" },
              ...API_BUCKETS.map((b) => ({ value: b, label: BUCKET_LABEL[b].label })),
            ]}
            onChange={(v) => {
              setFilters((f) => ({ ...f, page: 1, bucket: API_BUCKETS.find((b) => b === v) }));
            }}
          />
        </div>
      </FrameHeader>
      <FramePanel className="overflow-x-auto p-0">
        {logs.isPending ? (
          <Loading label="Loading the request log" shape="table" />
        ) : logs.isError ? (
          <div className="p-4">
            <ErrorState error={logs.error} />
          </div>
        ) : logs.data.items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No requests match. Requests are kept for 30 days.
          </p>
        ) : (
          <Table aria-label="Request log">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-end">Status</TableHead>
                <TableHead className="text-end">Time</TableHead>
                <TableHead>Request id</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {new Date(r.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.method} {r.route}
                  </TableCell>
                  <TableCell>{BUCKET_LABEL[r.bucket].label}</TableCell>
                  <TableCell className="text-end">
                    <Badge
                      variant={r.status >= 500 ? "error" : r.status >= 400 ? "warning" : "success"}
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{r.durationMs} ms</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.requestId}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FramePanel>
      {logs.data && logs.data.total > LOG_PAGE ? (
        <div className="border-t px-4 py-3">
          <PageNav
            page={filters.page}
            pageSize={LOG_PAGE}
            total={logs.data.total}
            label="requests"
            onPage={(page) => {
              setFilters((f) => ({ ...f, page }));
            }}
          />
        </div>
      ) : null}
    </Frame>
  );
}
