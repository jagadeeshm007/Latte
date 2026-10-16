import type { Usage, UsageHistory } from "@scc/shared";
import { useQuery } from "@tanstack/react-query";
import { ChartLineIcon } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  type BarShapeProps,
  CartesianGrid,
  Legend,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ErrorState, Loading, Stat } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usageHistoryQuery } from "@/lib/endpoints";

import { axisTick, PURPOSE_LABEL, PURPOSES, SERIES, tooltipStyle } from "./dashboard-labels";

const RANGES = [7, 30, 90] as const;
const OTHER = "other";

/** The series a purpose is drawn as: its fixed slot, or "other" past the fourth. */
function seriesOf(purpose: string): string {
  const i = PURPOSES.findIndex((p) => p === purpose);
  return i >= 0 && i < SERIES.length ? purpose : OTHER;
}
function colourOf(series: string): string {
  const i = PURPOSES.findIndex((p) => p === series);
  return i >= 0 && i < SERIES.length ? (SERIES[i] ?? "var(--viz-other)") : "var(--viz-other)";
}
const labelOf = (series: string) =>
  series === OTHER ? "Other" : (PURPOSE_LABEL[series] ?? series);

/** byDay lays the rows out one per day, every day of the range, with spend per series. */
function byDay(history: UsageHistory, series: string[]) {
  const out: Record<string, number | string>[] = [];
  for (let t = Date.parse(history.from); t <= Date.parse(history.to); t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    const row: Record<string, number | string> = { day: day.slice(5) };
    for (const s of series) row[s] = 0;
    for (const r of history.days.filter((d) => d.day === day)) {
      const s = seriesOf(r.purpose);
      row[s] = Number(row[s] ?? 0) + r.costUsd;
    }
    out.push(row);
  }
  return out;
}

/** UsageDialog is the full picture behind the spend card: spend per day, calls per purpose, every row. */
export function UsageDialog({ usage }: { usage: Usage }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const history = useQuery({ ...usageHistoryQuery(days), enabled: open });

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = (usage.spentUsd / Math.max(1, now.getDate())) * daysInMonth;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <ChartLineIcon aria-hidden="true" />
        View more
      </DialogTrigger>
      <DialogPopup className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Model spend</DialogTitle>
          <DialogDescription>
            Every model call the platform made, by day and purpose.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Spent this month" value={`$${usage.spentUsd.toFixed(2)}`} />
            <Stat label="Monthly budget" value={`$${usage.budgetUsd.toFixed(2)}`} />
            <Stat
              label="Projected month end"
              value={`$${projected.toFixed(2)}`}
              tone={projected > usage.budgetUsd ? "warning" : undefined}
              hint={projected > usage.budgetUsd ? "Over budget at this pace" : "Within budget"}
            />
            <Stat
              label="Calls this month"
              value={usage.byPurpose.reduce((n, p) => n + p.calls, 0)}
              hint={`${String(usage.byPurpose.reduce((n, p) => n + p.refused, 0))} refused`}
            />
          </div>
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Period"
            value={[String(days)]}
            onValueChange={(v: unknown[]) => {
              const next = RANGES.find((r) => String(r) === v[0]);
              if (next) setDays(next);
            }}
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r} value={String(r)}>
                Last {r} days
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {history.isPending ? (
            <Loading label="Loading spend" shape="chart" />
          ) : history.isError ? (
            <ErrorState error={history.error} />
          ) : (
            <HistoryView history={history.data} />
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

function HistoryView({ history }: { history: UsageHistory }) {
  const series = [...new Set(history.days.map((d) => seriesOf(d.purpose)))].sort(
    (a, b) =>
      (a === OTHER ? 99 : PURPOSES.findIndex((p) => p === a)) -
      (b === OTHER ? 99 : PURPOSES.findIndex((p) => p === b)),
  );
  if (series.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No model calls in this period.
      </p>
    );
  }
  const totals = series.map((s) => ({
    series: s,
    name: labelOf(s),
    calls: history.days.filter((d) => seriesOf(d.purpose) === s).reduce((n, d) => n + d.calls, 0),
  }));
  return (
    <>
      <section aria-labelledby="spend-per-day" className="flex flex-col gap-2">
        <h3 id="spend-per-day" className="text-sm font-medium">
          Spend per day (USD)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={byDay(history, series)} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                minTickGap={24}
              />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} width={56} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [`$${Number(value).toFixed(4)}`, labelOf(String(name))]}
              />
              {/* Unsorted: the legend reads in the same order as the stack. */}
              <Legend
                itemSorter={null}
                formatter={(name: string) => labelOf(name)}
                wrapperStyle={{ fontSize: 12 }}
              />
              {series.map((s) => (
                <Area
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stackId="spend"
                  stroke={colourOf(s)}
                  strokeWidth={2}
                  fill={colourOf(s)}
                  fillOpacity={0.25}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section aria-labelledby="calls-per-purpose" className="flex flex-col gap-2">
        <h3 id="calls-per-purpose" className="text-sm font-medium">
          Model calls by purpose
        </h3>
        <div style={{ height: `${String(totals.length * 36 + 24)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={totals} layout="vertical" margin={{ left: 8, right: 40 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--foreground)", fontSize: 12 }}
              />
              <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
              <Bar
                dataKey="calls"
                name="Calls"
                radius={[0, 4, 4, 0]}
                maxBarSize={22}
                label={{ position: "right", fill: "var(--foreground)", fontSize: 12 }}
                shape={(props: BarShapeProps) => (
                  // Each purpose keeps its own series colour.
                  <Rectangle {...props} fill={colourOf(totals[props.index]?.series ?? OTHER)} />
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section aria-labelledby="spend-table" className="flex flex-col gap-2">
        <h3 id="spend-table" className="text-sm font-medium">
          Every day and purpose
        </h3>
        <div className="max-h-64 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-end">Calls</TableHead>
                <TableHead className="text-end">Audio</TableHead>
                <TableHead className="text-end">Characters</TableHead>
                <TableHead className="text-end">Refused</TableHead>
                <TableHead className="text-end">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...history.days].reverse().map((d) => (
                <TableRow key={`${d.day}-${d.purpose}`}>
                  <TableCell className="tabular-nums">{d.day}</TableCell>
                  <TableCell>{PURPOSE_LABEL[d.purpose] ?? d.purpose}</TableCell>
                  <TableCell className="text-end tabular-nums">{d.calls}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {d.audioSeconds ? `${(d.audioSeconds / 60).toFixed(1)} min` : ""}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {d.characters ? d.characters.toLocaleString("en-IN") : ""}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{d.refused || ""}</TableCell>
                  <TableCell className="text-end tabular-nums">${d.costUsd.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
