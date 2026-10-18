import {
  DASHBOARD_GROUPS,
  type DashboardGroup,
  type LeaderboardSort,
  type LeaderRow,
} from "@scc/shared";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  DownloadIcon,
  SearchIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { PageNav } from "@/components/PageNav";
import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
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
import { toastManager } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SavedViewsMenu } from "@/features/views/SavedViewsMenu";
import { saveCsv } from "@/lib/download";
import { leaderboardQuery, rubricQuery, type LeaderboardParams } from "@/lib/endpoints";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { groupName, rateTone } from "./dashboard-labels";
import { RANGES, rangeOf, type RangeKey } from "./date-range";
import {
  PERFORMANCE_PAGE_SIZE,
  performanceSearchSchema,
  type PerformanceSearch,
} from "./performance-search";

// Every team, product, agent or language ranked: sorted, searched and paged on
// the server, so 500 agents read as easily as five. State lives in the URL.

const GROUP_LABEL: Record<DashboardGroup, string> = {
  agent: "Agents",
  team: "Teams",
  product: "Products",
  language: "Languages",
};
const MIN_CALLS = [
  { value: "0", label: "Any number of calls" },
  { value: "1", label: "1 call or more" },
  { value: "3", label: "3 calls or more" },
  { value: "10", label: "10 calls or more" },
];
const SEARCH_DELAY_MS = 300;
/** The CSV takes every row, a hundred per request, up to this many. */
const CSV_MAX_ROWS = 5000;

const COLUMNS: { sort: LeaderboardSort; label: string; numeric: boolean }[] = [
  { sort: "name", label: "Name", numeric: false },
  { sort: "calls", label: "Calls", numeric: true },
  { sort: "avgScore", label: "Avg score", numeric: true },
  { sort: "flagRate", label: "Flag rate", numeric: true },
  { sort: "breaches", label: "Breaches", numeric: true },
];

export function PerformancePage({
  search,
  onSearch,
}: {
  search: PerformanceSearch;
  onSearch: (next: PerformanceSearch) => void;
}) {
  const by = search.by ?? "agent";
  const sort = search.sort ?? "avgScore";
  const dir = search.dir ?? "desc";
  const page = search.page ?? 1;
  const range: RangeKey = search.range ?? "30d";
  const minCalls = search.min ?? 1;
  const params: LeaderboardParams = {
    ...rangeOf(range),
    groupBy: by,
    q: search.q,
    sort,
    dir,
    page,
    limit: PERFORMANCE_PAGE_SIZE,
    minCalls,
  };
  const board = useQuery({ ...leaderboardQuery(params), placeholderData: keepPreviousData });
  const rubric = useQuery(rubricQuery);
  const mandatory = (rubric.data?.items ?? []).filter((i) => i.type === "mandatory");
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [text, setText] = useState(search.q ?? "");

  const set = (patch: Partial<PerformanceSearch>) => {
    onSearch({ ...search, ...patch, page: undefined });
  };

  // Typing settles before the URL changes, so each keystroke is not a request.
  useEffect(() => {
    const next = text.trim() || undefined;
    if (next === search.q) return;
    const timer = setTimeout(() => {
      onSearch({ ...search, q: next, page: undefined });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, search, onSearch]);

  function toggleSort(next: LeaderboardSort) {
    if (next === sort) set({ sort, dir: dir === "desc" ? "asc" : "desc" });
    else set({ sort: next, dir: next === "name" ? "asc" : "desc" });
  }

  async function downloadCsv() {
    setExporting(true);
    try {
      const rows: LeaderRow[] = [];
      for (let p = 1; rows.length < CSV_MAX_ROWS; p++) {
        const part = await queryClient.query(leaderboardQuery({ ...params, page: p, limit: 100 }));
        rows.push(...part.items);
        if (rows.length >= part.total || part.items.length === 0) break;
      }
      saveCsv(
        [
          [
            "Name",
            "Calls scored",
            "Average score",
            "Flag rate",
            "Breaches",
            ...mandatory.map((i) => i.label),
          ],
          ...rows.map((r) => [
            groupName(by, r.name),
            r.callsScored,
            r.avgOverall,
            r.flagRate,
            r.breaches,
            ...mandatory.map((i) => r.items.find((x) => x.key === i.key)?.passRate ?? null),
          ]),
        ],
        `performance-${by}-${params.from}-to-${params.to}.csv`,
      );
    } catch (e) {
      toastManager.add({
        type: "error",
        title: "Could not build the CSV",
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Performance"
        description="Every agent, team, product and language, ranked for the period you choose."
        actions={
          <>
            <SavedViewsMenu
              page="performance"
              current={{ ...search, page: undefined }}
              onApply={(view) => {
                const next = performanceSearchSchema.parse(view);
                setText(next.q ?? "");
                onSearch({ ...next, page: undefined });
              }}
            />
            <Button
              variant="outline"
              size="sm"
              loading={exporting}
              disabled={!board.data?.total}
              onClick={() => void downloadCsv()}
            >
              <DownloadIcon aria-hidden="true" />
              Download CSV
            </Button>
          </>
        }
      />
      <Frame>
        <FrameHeader className="flex-row flex-wrap items-center gap-2 px-4 py-3">
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Rank"
            value={[by]}
            onValueChange={(v: unknown[]) => {
              const next = DASHBOARD_GROUPS.find((g) => g === v[0]);
              if (next) set({ by: next, q: undefined });
              setText("");
            }}
          >
            {DASHBOARD_GROUPS.map((g) => (
              <ToggleGroupItem key={g} value={g}>
                {GROUP_LABEL[g]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <InputGroup className="w-full sm:w-56">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              size="sm"
              type="search"
              aria-label={`Search ${GROUP_LABEL[by].toLowerCase()}`}
              placeholder={`Search ${GROUP_LABEL[by].toLowerCase()}`}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
              }}
            />
          </InputGroup>
          <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
            <ToggleGroup
              variant="outline"
              size="sm"
              aria-label="Period"
              value={[range]}
              onValueChange={(v: unknown[]) => {
                const next = RANGES.find((r) => r.value === v[0]);
                if (next) set({ range: next.value });
              }}
            >
              {RANGES.map((r) => (
                <ToggleGroupItem key={r.value} value={r.value}>
                  {r.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <OptionSelect
              label="Minimum calls"
              size="sm"
              className="w-44"
              value={String(minCalls)}
              options={MIN_CALLS}
              onChange={(v) => {
                set({ min: Number(v) });
              }}
            />
          </div>
        </FrameHeader>
        <FramePanel className="p-0">
          {board.isPending ? (
            <Loading label="Loading the ranking" shape="table" />
          ) : board.isError ? (
            <div className="p-4">
              <ErrorState error={board.error} />
            </div>
          ) : board.data.items.length === 0 ? (
            <EmptyState
              title={search.q ? "Nothing matches" : "No scored calls in this period"}
              description={
                search.q
                  ? "Try another name, or clear the search."
                  : "Pick a longer period or lower the minimum calls."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table aria-label={`${GROUP_LABEL[by]} ranked`}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {COLUMNS.map((c) => (
                      <TableHead
                        key={c.sort}
                        aria-sort={
                          c.sort === sort ? (dir === "asc" ? "ascending" : "descending") : "none"
                        }
                        className={cn(c.numeric && "text-end")}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            toggleSort(c.sort);
                          }}
                          className="inline-flex items-center gap-1 rounded font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {c.label}
                          {c.sort !== sort ? (
                            <ArrowUpDownIcon aria-hidden="true" className="size-3 opacity-50" />
                          ) : dir === "asc" ? (
                            <ArrowUpIcon aria-hidden="true" className="size-3" />
                          ) : (
                            <ArrowDownIcon aria-hidden="true" className="size-3" />
                          )}
                        </button>
                      </TableHead>
                    ))}
                    <TableHead>Mandatory items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.data.items.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {(page - 1) * PERFORMANCE_PAGE_SIZE + i + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {by === "agent" ? (
                          <Link
                            to="/agents/$agentId"
                            params={{ agentId: r.id }}
                            className="underline-offset-4 hover:underline"
                          >
                            {r.name}
                          </Link>
                        ) : (
                          groupName(by, r.name)
                        )}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{r.callsScored}</TableCell>
                      <TableCell className="text-end">
                        <span className="inline-flex items-center gap-2 tabular-nums">
                          <span
                            className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block"
                            aria-hidden="true"
                          >
                            {r.avgOverall !== null ? (
                              <span
                                className={cn(
                                  "block h-full rounded-full",
                                  rateTone(r.avgOverall / 100),
                                )}
                                style={{ width: `${String(r.avgOverall)}%` }}
                              />
                            ) : null}
                          </span>
                          {r.avgOverall === null ? "None" : `${r.avgOverall.toFixed(1)}%`}
                        </span>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatPercent(r.flagRate)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-end tabular-nums",
                          r.breaches > 0 && "font-medium text-destructive-foreground",
                        )}
                      >
                        {r.breaches}
                      </TableCell>
                      <TableCell>
                        <ItemStrip row={r} items={mandatory} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </FramePanel>
        {board.data && board.data.total > PERFORMANCE_PAGE_SIZE ? (
          <div className="border-t px-4 py-3">
            <PageNav
              page={page}
              pageSize={PERFORMANCE_PAGE_SIZE}
              total={board.data.total}
              label={GROUP_LABEL[by].toLowerCase()}
              onPage={(next) => {
                onSearch({ ...search, page: next });
              }}
            />
          </div>
        ) : null}
      </Frame>
    </div>
  );
}

/** ItemStrip: one small block per mandatory item, coloured by pass rate, named for screen readers. */
function ItemStrip({ row, items }: { row: LeaderRow; items: { key: string; label: string }[] }) {
  return (
    <ul aria-label={`Mandatory items, ${row.name}`} className="flex gap-0.5">
      {items.map((item) => {
        const rate = row.items.find((x) => x.key === item.key)?.passRate ?? null;
        const text = `${item.label}: ${rate === null ? "not applicable" : formatPercent(rate)}`;
        return (
          <li
            key={item.key}
            title={text}
            className={cn("size-3 rounded-sm", rate === null ? "bg-muted" : rateTone(rate))}
          >
            <span className="sr-only">{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
