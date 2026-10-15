import type { Agreement, Dashboard, Usage } from "@scc/shared";
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
import { agreementQuery, dashboardQuery, rubricQuery, usageQuery } from "@/lib/endpoints";
import { formatPercent } from "@/lib/format";

// S8: compliance by team and product, judge agreement per item and model
// spend against the budget (US-01-007, US-01-008, US-02-001).

export function DashboardPage() {
  const [groupBy, setGroupBy] = useState<"team" | "product">("team");
  const dashboard = useQuery(dashboardQuery(groupBy));
  const agreement = useQuery(agreementQuery);
  const usage = useQuery(usageQuery);
  const rubric = useQuery(rubricQuery);
  const labels = new Map((rubric.data?.items ?? []).map((i) => [i.key, i.label]));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dashboard"
        description="Where compliance slips, how far the judge can be trusted, and what it costs."
      />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Frame role="region" aria-labelledby="groups-heading" className="min-w-0">
          <FrameHeader className="flex-row items-center justify-between gap-2 px-3 py-2">
            <FrameTitle role="heading" aria-level={2} id="groups-heading">
              Results by {groupBy}
            </FrameTitle>
            <ToggleGroup
              variant="outline"
              size="sm"
              aria-label="Group results"
              value={[groupBy]}
              onValueChange={(v: unknown[]) => {
                if (v[0] === "team" || v[0] === "product") setGroupBy(v[0]);
              }}
            >
              <ToggleGroupItem value="team">By team</ToggleGroupItem>
              <ToggleGroupItem value="product">By product</ToggleGroupItem>
            </ToggleGroup>
          </FrameHeader>
          <FramePanel className="p-0">
            {dashboard.isPending ? (
              <Loading />
            ) : dashboard.isError ? (
              <ErrorState error={dashboard.error} />
            ) : (
              <GroupTable data={dashboard.data} labels={labels} />
            )}
          </FramePanel>
        </Frame>
        {usage.isPending ? (
          <Loading />
        ) : usage.isError ? (
          <ErrorState error={usage.error} />
        ) : (
          <UsageCard usage={usage.data} />
        )}
      </div>
      <Frame role="region" aria-labelledby="agreement-heading">
        <FrameHeader className="px-3 py-2">
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
            <Loading />
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

function GroupTable({ data, labels }: { data: Dashboard; labels: Map<string, string> }) {
  const mandatoryKeys = data.groups[0]?.items.map((i) => i.key) ?? [];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{data.groupBy === "team" ? "Team" : "Product"}</TableHead>
          <TableHead className="text-end">Calls</TableHead>
          <TableHead className="text-end">Flagged</TableHead>
          <TableHead className="text-end">Avg score</TableHead>
          {mandatoryKeys.map((k) => (
            <TableHead key={k} className="text-end">
              {labels.get(k) ?? k}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.groups.map((g) => (
          <TableRow key={g.id}>
            <TableCell className="font-medium">{g.name}</TableCell>
            <TableCell className="text-end tabular-nums">{g.callsScored}</TableCell>
            <TableCell className="text-end tabular-nums">
              {g.flagRate === null ? "" : formatPercent(g.flagRate)}
            </TableCell>
            <TableCell className="text-end tabular-nums">
              {g.avgOverall === null ? "" : `${g.avgOverall.toFixed(0)}%`}
            </TableCell>
            {g.items.map((i) => (
              <TableCell key={i.key} className="text-end tabular-nums">
                {i.passRate === null ? "" : formatPercent(i.passRate)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function UsageCard({ usage }: { usage: Usage }) {
  const share = usage.budgetUsd > 0 ? Math.min(1, usage.spentUsd / usage.budgetUsd) : 1;
  return (
    <Frame role="region" aria-labelledby="usage-heading">
      <FrameHeader className="px-3 py-2">
        <FrameTitle role="heading" aria-level={2} id="usage-heading">
          Model spend this month
        </FrameTitle>
        <FrameDescription>
          ${usage.spentUsd.toFixed(4)} of ${usage.budgetUsd.toFixed(2)} budget
        </FrameDescription>
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
