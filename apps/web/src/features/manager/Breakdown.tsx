import type { DashboardGroup, Leaderboard, LeaderboardSort } from "@scc/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ErrorState, Loading } from "@/components/states";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { leaderboardQuery } from "@/lib/endpoints";

import { groupName } from "./dashboard-labels";
import { rangeOf, type RangeKey } from "./date-range";

type By = Extract<DashboardGroup, "language" | "product" | "agent">;
type Measure = "calls" | "score" | "flagged";

const BY: { value: By; label: string }[] = [
  { value: "language", label: "Language" },
  { value: "product", label: "Product" },
  { value: "agent", label: "Agent" },
];

// One measure per chart: calls, scores and flag rates have different scales, so
// they are never drawn on two axes of one chart.
const MEASURE_INFO: Record<
  Measure,
  { value: Measure; label: string; unit: string; sort: LeaderboardSort }
> = {
  calls: { value: "calls", label: "Calls scored", unit: "", sort: "calls" },
  score: { value: "score", label: "Average score", unit: "%", sort: "avgScore" },
  flagged: { value: "flagged", label: "Flag rate", unit: "%", sort: "flagRate" },
};
const MEASURES = Object.values(MEASURE_INFO);
/** The chart shows the top of the ranking; the Performance page has the rest. */
const TOP = 10;

function rows(data: Leaderboard, measure: Measure) {
  return data.items
    .map((g) => ({
      name: groupName(data.groupBy, g.name),
      value:
        measure === "calls"
          ? g.callsScored
          : measure === "score"
            ? g.avgOverall
            : g.flagRate === null
              ? null
              : Math.round(g.flagRate * 1000) / 10,
    }))
    .filter((r): r is { name: string; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value);
}

/** Breakdown charts one measure by language, product or agent, with a table for exact numbers. */
export function Breakdown({ range }: { range: RangeKey }) {
  const [by, setBy] = useState<By>("language");
  const [measure, setMeasure] = useState<Measure>("calls");
  const [asTable, setAsTable] = useState(false);
  const chosen = MEASURE_INFO[measure];
  const data = useQuery(
    leaderboardQuery({
      ...rangeOf(range),
      groupBy: by,
      sort: chosen.sort,
      dir: "desc",
      page: 1,
      limit: TOP,
    }),
  );
  const { unit, label } = chosen;
  const shown = data.data ? rows(data.data, measure) : [];

  return (
    <Frame role="region" aria-labelledby="breakdown-heading" className="min-w-0">
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <FrameTitle role="heading" aria-level={2} id="breakdown-heading">
            {label} by {by}
          </FrameTitle>
          <FrameDescription>
            {data.data && data.data.total > TOP ? (
              <>
                Top {TOP} of {data.data.total}.{" "}
                <Link
                  to="/performance"
                  search={{ by, sort: chosen.sort, dir: "desc", range }}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  View all
                </Link>
              </>
            ) : (
              "Scored calls, deleted calls left out."
            )}
          </FrameDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Break down by"
            value={[by]}
            onValueChange={(v: unknown[]) => {
              const next = BY.find((b) => b.value === v[0]);
              if (next) setBy(next.value);
            }}
          >
            {BY.map((b) => (
              <ToggleGroupItem key={b.value} value={b.value}>
                {b.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Measure"
            value={[measure]}
            onValueChange={(v: unknown[]) => {
              const next = MEASURES.find((m) => m.value === v[0]);
              if (next) setMeasure(next.value);
            }}
          >
            {MEASURES.map((m) => (
              <ToggleGroupItem key={m.value} value={m.value}>
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Show as"
            value={[asTable ? "table" : "chart"]}
            onValueChange={(v: unknown[]) => {
              setAsTable(v[0] === "table");
            }}
          >
            <ToggleGroupItem value="chart">Chart</ToggleGroupItem>
            <ToggleGroupItem value="table">Table</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </FrameHeader>
      <FramePanel className="p-0">
        {data.isPending ? (
          <Loading label="Loading the breakdown" shape="chart" />
        ) : data.isError ? (
          <div className="p-4">
            <ErrorState error={data.error} />
          </div>
        ) : shown.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No scored calls yet.
          </p>
        ) : asTable ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="capitalize">{by}</TableHead>
                <TableHead className="text-end">{label}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.name}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {r.value}
                    {unit}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div
            className="px-2 py-3"
            // One bar per group, so the chart grows with the groups instead of squeezing them.
            style={{ height: `${String(Math.max(160, shown.length * 36 + 40))}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shown} layout="vertical" margin={{ left: 8, right: 32 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  domain={unit === "%" ? [0, 100] : [0, "auto"]}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  unit={unit}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--foreground)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${String(value)}${unit}`, label]}
                />
                <Bar
                  dataKey="value"
                  name={label}
                  fill="var(--viz-1)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                  label={{
                    position: "right",
                    fill: "var(--foreground)",
                    fontSize: 12,
                    formatter: (v: unknown) => `${String(v)}${unit}`,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </FramePanel>
    </Frame>
  );
}
