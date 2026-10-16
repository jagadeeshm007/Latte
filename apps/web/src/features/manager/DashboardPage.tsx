import type { Agreement, Usage } from "@scc/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorState, Loading, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { Meter, MeterIndicator, MeterTrack } from "@/components/ui/meter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { agreementQuery, highlightsQuery, usageQuery } from "@/lib/endpoints";
import { formatPercent } from "@/lib/format";

import { Breakdown } from "./Breakdown";
import { RANGES, rangeOf, type RangeKey } from "./date-range";
import { HighlightsGrid, KpiStrip } from "./Highlights";
import { UsageDialog } from "./UsageDialog";

// S8: the period at a glance (headline numbers and the few agents, teams and
// items worth acting on), a breakdown chart, judge agreement per item and
// model spend against the budget (US-01-007, US-01-008, US-02-001). Full
// rankings live on the Performance page.

export function DashboardPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const dates = rangeOf(range);
  const highlights = useQuery(highlightsQuery(dates));
  const agreement = useQuery(agreementQuery);
  const usage = useQuery(usageQuery);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Where compliance slips, how far the judge can be trusted, and what it costs."
        actions={
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Period"
            value={[range]}
            onValueChange={(v: unknown[]) => {
              const next = RANGES.find((r) => r.value === v[0]);
              if (next) setRange(next.value);
            }}
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
      {highlights.isPending ? (
        <Loading label="Loading highlights" shape="cards" />
      ) : highlights.isError ? (
        <ErrorState error={highlights.error} />
      ) : (
        <>
          <KpiStrip data={highlights.data} />
          <HighlightsGrid data={highlights.data} range={range} />
        </>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Breakdown range={range} />
        {usage.isPending ? (
          <Loading label="Loading spend" shape="text" />
        ) : usage.isError ? (
          <ErrorState error={usage.error} />
        ) : (
          <UsageCard usage={usage.data} />
        )}
      </div>
      <Frame role="region" aria-labelledby="agreement-heading">
        <FrameHeader className="px-4 py-3">
          <FrameTitle role="heading" aria-level={2} id="agreement-heading">
            Judge agreement with QA
          </FrameTitle>
          <FrameDescription>
            Per rubric item: findings QA agreed with, disagreed with, and breaches or misses the
            judge did not report.
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="p-0">
          {agreement.isPending ? (
            <Loading label="Loading agreement" shape="table" />
          ) : agreement.isError ? (
            <ErrorState error={agreement.error} />
          ) : (
            <AgreementTable data={agreement.data} />
          )}
        </FramePanel>
      </Frame>
    </div>
  );
}

export function UsageCard({ usage }: { usage: Usage }) {
  const share = usage.budgetUsd > 0 ? Math.min(1, usage.spentUsd / usage.budgetUsd) : 1;
  return (
    <Frame role="region" aria-labelledby="usage-heading">
      <FrameHeader className="px-4 py-3">
        <FrameTitle role="heading" aria-level={2} id="usage-heading">
          Model spend this month
        </FrameTitle>
        <FrameDescription>
          ${usage.spentUsd.toFixed(4)} of ${usage.budgetUsd.toFixed(2)} budget
        </FrameDescription>
        <div className="mt-2">
          <UsageDialog usage={usage} />
        </div>
      </FrameHeader>
      <FramePanel className="flex flex-col gap-3 px-4 py-3">
        {share >= 0.8 ? (
          <Badge variant={share >= 1 ? "error" : "warning"} className="self-start">
            {share >= 1 ? "Budget reached: new calls are refused" : "Over 80% used"}
          </Badge>
        ) : null}
        <Meter value={share * 100} aria-label="Share of the monthly model budget used">
          <MeterTrack>
            <MeterIndicator />
          </MeterTrack>
        </Meter>
        <ul className="divide-y text-sm">
          {usage.byPurpose.map((p) => (
            <li key={p.purpose} className="flex justify-between gap-2 py-1.5">
              <span className="capitalize">{p.purpose.replace("_", " ")}</span>
              <span className="text-muted-foreground tabular-nums">
                {p.calls} calls · ${p.costUsd.toFixed(4)}
                {p.refused ? ` · ${String(p.refused)} refused` : ""}
              </span>
            </li>
          ))}
          {usage.byPurpose.length === 0 ? (
            <li className="py-1.5 text-muted-foreground">No model calls this month.</li>
          ) : null}
        </ul>
      </FramePanel>
    </Frame>
  );
}

export function AgreementTable({ data }: { data: Agreement }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rubric item</TableHead>
          <TableHead className="text-end">Agreed</TableHead>
          <TableHead className="text-end">Disagreed</TableHead>
          <TableHead className="text-end">Judge missed</TableHead>
          <TableHead className="text-end">Agreement</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((i) => (
          <TableRow key={i.key}>
            <TableCell>
              {i.label} <span className="text-xs text-muted-foreground capitalize">{i.type}</span>
            </TableCell>
            <TableCell className="text-end tabular-nums">{i.agreed}</TableCell>
            <TableCell className="text-end tabular-nums">{i.disagreed}</TableCell>
            <TableCell className="text-end tabular-nums">
              {i.judgeMisses > 0 ? <Badge variant="error">{i.judgeMisses}</Badge> : 0}
            </TableCell>
            <TableCell className="text-end tabular-nums">
              {i.rate === null ? "No reviews yet" : formatPercent(i.rate)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
