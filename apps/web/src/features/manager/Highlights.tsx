import type { Highlights, LeaderRow, LeaderboardSort } from "@scc/shared";
import { Link } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { groupName, rateTone } from "./dashboard-labels";
import type { RangeKey } from "./date-range";

// The dashboard at scale: a handful of headline numbers and the few agents,
// teams and items worth acting on. Everything else lives on the Performance
// page, one "View all" away.

type Better = "up" | "down" | "none";

interface Kpi {
  label: string;
  value: number | null;
  previous: number | null;
  format: (n: number) => string;
  /** Which way is good news; calls scored is neither. */
  better: Better;
  /** Change is shown in points for rates, in units for counts. */
  unit: string;
}

const count = (n: number) => n.toLocaleString("en-IN");

/** KpiStrip: the period's headline numbers, each with its change since the period before. */
export function KpiStrip({ data }: { data: Highlights }) {
  const { kpis } = data;
  const items: Kpi[] = [
    { label: "Calls scored", ...kpis.callsScored, format: count, better: "none", unit: "" },
    {
      label: "Average score",
      ...kpis.avgScore,
      format: (n) => `${n.toFixed(1)}%`,
      better: "up",
      unit: " pts",
    },
    {
      label: "Flag rate",
      value: kpis.flagRate.value === null ? null : kpis.flagRate.value * 100,
      previous: kpis.flagRate.previous === null ? null : kpis.flagRate.previous * 100,
      format: (n) => `${n.toFixed(0)}%`,
      better: "down",
      unit: " pts",
    },
    { label: "Breaches", ...kpis.breaches, format: count, better: "down", unit: "" },
  ];
  return (
    <dl
      aria-label="Headline numbers"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-xs/5 sm:grid-cols-3 lg:grid-cols-5"
    >
      {items.map((k) => (
        <div key={k.label} className="flex flex-col gap-1 bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">{k.label}</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {k.value === null ? "None" : k.format(k.value)}
          </dd>
          <dd>
            <Delta kpi={k} />
          </dd>
        </div>
      ))}
      <div className="flex flex-col gap-1 bg-card px-4 py-3">
        <dt className="text-xs text-muted-foreground">Waiting for QA</dt>
        <dd className="text-2xl font-semibold tabular-nums">{count(kpis.reviewBacklog)}</dd>
        <dd>
          <Link
            to="/queue"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Open the queue <ArrowRightIcon aria-hidden="true" className="size-3" />
          </Link>
        </dd>
      </div>
    </dl>
  );
}

function Delta({ kpi }: { kpi: Kpi }) {
  if (kpi.value === null || kpi.previous === null) {
    return <span className="text-xs text-muted-foreground">No earlier period to compare</span>;
  }
  const change = Math.round((kpi.value - kpi.previous) * 10) / 10;
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <MinusIcon aria-hidden="true" className="size-3" />
        Same as the period before
      </span>
    );
  }
  const up = change > 0;
  const good = kpi.better === "none" ? null : (kpi.better === "up") === up;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-px text-xs font-medium tabular-nums",
        good === null
          ? "bg-muted text-muted-foreground"
          : good
            ? "bg-success/10 text-success-foreground"
            : "bg-destructive/10 text-destructive-foreground",
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {up ? "Up" : "Down"} {Math.abs(change).toLocaleString("en-IN")}
      {kpi.unit}
      <span className="sr-only"> on the period before</span>
    </span>
  );
}

/** HighlightCard: a titled short list with a "View all" link to the full ranking. */
function HighlightCard({
  id,
  title,
  description,
  viewAll,
  children,
}: {
  id: string;
  title: string;
  description: string;
  viewAll: ReactNode;
  children: ReactNode;
}) {
  return (
    <Frame role="region" aria-labelledby={id} className="min-w-0">
      <FrameHeader className="flex-row items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <FrameTitle role="heading" aria-level={2} id={id}>
            {title}
          </FrameTitle>
          <FrameDescription>{description}</FrameDescription>
        </div>
        {viewAll}
      </FrameHeader>
      <FramePanel className="p-0">{children}</FramePanel>
    </Frame>
  );
}

function ViewAll({
  by,
  sort,
  dir,
  range,
  label,
}: {
  by: "agent" | "team";
  sort: LeaderboardSort;
  dir: "asc" | "desc";
  range: RangeKey;
  label: string;
}) {
  return (
    <Link
      to="/performance"
      search={{ by, sort, dir, range }}
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      View all <ArrowRightIcon aria-hidden="true" className="size-3" />
    </Link>
  );
}

function RankList({
  rows,
  by,
  metric,
  empty,
}: {
  rows: LeaderRow[];
  by: "agent" | "team";
  metric: (r: LeaderRow) => string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ol className="divide-y">
      {rows.map((r, i) => (
        <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1">
            {by === "agent" ? (
              <Link
                to="/agents/$agentId"
                params={{ agentId: r.id }}
                className="block truncate font-medium underline-offset-4 hover:underline"
              >
                {r.name}
              </Link>
            ) : (
              <span className="block truncate font-medium">{r.name}</span>
            )}
            <span className="block text-xs text-muted-foreground tabular-nums">
              {r.callsScored} calls · {r.breaches} breach{r.breaches === 1 ? "" : "es"}
            </span>
          </span>
          <span className="font-semibold tabular-nums">{metric(r)}</span>
        </li>
      ))}
    </ol>
  );
}

const score = (r: LeaderRow) => (r.avgOverall === null ? "None" : `${r.avgOverall.toFixed(1)}%`);
const NOT_ENOUGH = "Agents appear here once they have three scored calls in this period.";

/** HighlightsGrid: top and bottom agents, the riskiest teams, the most failed items and the mix. */
export function HighlightsGrid({ data, range }: { data: Highlights; range: RangeKey }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <HighlightCard
        id="top-heading"
        title="Top performers"
        description="Highest average score"
        viewAll={
          <ViewAll
            by="agent"
            sort="avgScore"
            dir="desc"
            range={range}
            label="View all agents, best first"
          />
        }
      >
        <RankList rows={data.topAgents} by="agent" metric={score} empty={NOT_ENOUGH} />
      </HighlightCard>
      <HighlightCard
        id="coach-heading"
        title="Needs coaching"
        description="Lowest average score"
        viewAll={
          <ViewAll
            by="agent"
            sort="avgScore"
            dir="asc"
            range={range}
            label="View all agents, lowest first"
          />
        }
      >
        <RankList rows={data.bottomAgents} by="agent" metric={score} empty={NOT_ENOUGH} />
      </HighlightCard>
      <HighlightCard
        id="teams-heading"
        title="Riskiest teams"
        description="Highest share of flagged calls"
        viewAll={
          <ViewAll
            by="team"
            sort="flagRate"
            dir="desc"
            range={range}
            label="View all teams, most flagged first"
          />
        }
      >
        <RankList
          rows={data.riskiestTeams}
          by="team"
          metric={(r) => `${formatPercent(r.flagRate)} flagged`}
          empty="No team has a flagged call in this period."
        />
      </HighlightCard>
      <HighlightCard
        id="items-heading"
        title="Most failed items"
        description="Share of calls where the item was missed or breached"
        viewAll={null}
      >
        {data.failedItems.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No rubric item failed in this period.
          </p>
        ) : (
          <ul className="flex flex-col gap-3 px-4 py-3">
            {data.failedItems.map((item) => (
              <li key={item.key} className="flex flex-col gap-1 text-sm">
                <span className="flex justify-between gap-2">
                  <span className="truncate font-medium">{item.label}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {item.failed} of {item.applicable} · {formatPercent(item.failRate)}
                  </span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span
                    className={cn("block h-full rounded-full", rateTone(1 - item.failRate))}
                    style={{ width: `${String(item.failRate * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </HighlightCard>
      <HighlightCard
        id="mix-heading"
        title="Call mix"
        description="Scored calls by language and product"
        viewAll={null}
      >
        <div className="grid gap-4 px-4 py-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
          <MixList
            label="Languages"
            rows={data.languageMix.map((m) => ({
              ...m,
              name: m.name === "Other" ? m.name : groupName("language", m.name),
            }))}
          />
          <MixList label="Products" rows={data.productMix} />
        </div>
      </HighlightCard>
    </div>
  );
}

function MixList({ label, rows }: { label: string; rows: { name: string; calls: number }[] }) {
  const total = rows.reduce((sum, r) => sum + r.calls, 0);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No scored calls.</p>
      ) : (
        <ul aria-label={label} className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-2 text-sm">
              <span className="w-20 shrink-0 truncate">{r.name}</span>
              <span
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${String(total ? (r.calls / total) * 100 : 0)}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-end text-muted-foreground tabular-nums">
                {r.calls}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
