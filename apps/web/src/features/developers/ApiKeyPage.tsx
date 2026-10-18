import type { ApiBucket, ApiKey, ApiKeyMetrics } from "@scc/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import { axisTick, SERIES, tooltipStyle } from "@/features/manager/dashboard-labels";
import { apiKeyMetricsQuery, apiKeyQuery } from "@/lib/endpoints";
import { formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { BUCKET_LABEL, keyStatus, maskedKey, SCOPE_LABEL, STATUS_BADGE } from "./key-labels";
import { KeyLogs } from "./KeyLogs";
import { RevokeKey } from "./RevokeKey";
import { RotateKeyDialog } from "./RotateKeyDialog";

// One API key: its traffic per day, how close it runs to each limit, its
// busiest routes and every request it made, newest first (ADR-0018).

const PERIODS = [7, 30] as const;
/** Fixed series order, so a colour always means the same outcome (dataviz: never cycled). */
const OUTCOMES = [
  { key: "ok", label: "Succeeded", color: SERIES[0] },
  { key: "clientErrors", label: "Client errors", color: SERIES[2] },
  { key: "rateLimited", label: "Rate limited", color: SERIES[3] },
  { key: "serverErrors", label: "Server errors", color: SERIES[1] },
] as const;

export function ApiKeyPage({ keyId }: { keyId: string }) {
  const key = useQuery(apiKeyQuery(keyId));
  if (key.isPending) return <Loading label="Loading the API key" />;
  if (key.isError) return <ErrorState error={key.error} title="Could not open this API key" />;
  return <KeyView apiKey={key.data} />;
}

function KeyView({ apiKey }: { apiKey: ApiKey }) {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(7);
  const metrics = useQuery({
    ...apiKeyMetricsQuery(apiKey.id, days),
    placeholderData: keepPreviousData,
  });
  const status = keyStatus(apiKey);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={apiKey.name}
        description={`${maskedKey(apiKey.prefix)} · created ${formatDate(apiKey.createdAt.slice(0, 10))} by ${apiKey.createdByName}${apiKey.expiresAt ? ` · expires ${formatDate(apiKey.expiresAt.slice(0, 10))}` : ""}`}
        actions={
          <>
            <ToggleGroup
              variant="outline"
              size="sm"
              aria-label="Period"
              value={[String(days)]}
              onValueChange={(v: unknown[]) => {
                const next = PERIODS.find((p) => String(p) === v[0]);
                if (next) setDays(next);
              }}
            >
              {PERIODS.map((p) => (
                <ToggleGroupItem key={p} value={String(p)}>
                  {p} days
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {status === "active" ? <RotateKeyDialog apiKey={apiKey} /> : null}
            {status === "active" ? <RevokeKey apiKey={apiKey} /> : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Key status and scopes">
          <Badge variant={STATUS_BADGE[status].variant}>{STATUS_BADGE[status].label}</Badge>
          {apiKey.scopes.map((s) => (
            <Badge key={s} variant="outline">
              {SCOPE_LABEL[s].label}
            </Badge>
          ))}
        </div>
      </PageHeader>
      {metrics.isPending ? (
        <Loading label="Loading traffic" shape="chart" />
      ) : metrics.isError ? (
        <ErrorState error={metrics.error} />
      ) : (
        <Traffic metrics={metrics.data} days={days} />
      )}
      <KeyLogs keyId={apiKey.id} />
    </div>
  );
}

function Traffic({ metrics, days }: { metrics: ApiKeyMetrics; days: number }) {
  const [asTable, setAsTable] = useState(false);
  const { totals } = metrics;
  const stats: [string, string][] = [
    ["Requests", totals.requests.toLocaleString("en-IN")],
    ["Error rate", formatPercent(totals.errorRate, 1)],
    ["Median time", totals.p50Ms === null ? "None" : `${String(totals.p50Ms)} ms`],
    ["95th percentile", totals.p95Ms === null ? "None" : `${String(totals.p95Ms)} ms`],
    ["Calls uploaded", metrics.usage.callsUploaded.toLocaleString("en-IN")],
    ["Model spend", `$${metrics.usage.costUsd.toFixed(4)}`],
  ];
  return (
    <>
      <dl
        aria-label="Traffic summary"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-6"
      >
        {stats.map(([term, value]) => (
          <div key={term} className="bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{term}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Frame role="region" aria-labelledby="traffic-heading" className="min-w-0">
          <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <FrameTitle role="heading" aria-level={2} id="traffic-heading">
                Requests per day
              </FrameTitle>
              <FrameDescription>Last {days} days, by outcome.</FrameDescription>
            </div>
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
          </FrameHeader>
          <FramePanel className={cn(asTable ? "p-0" : "px-2 py-3")}>
            {metrics.days.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No requests in this period.
              </p>
            ) : asTable ? (
              <Table aria-label="Requests per day">
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    {OUTCOMES.map((o) => (
                      <TableHead key={o.key} className="text-end">
                        {o.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-end">p95</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.days.map((d) => (
                    <TableRow key={d.day}>
                      <TableCell>{formatDate(d.day)}</TableCell>
                      {OUTCOMES.map((o) => (
                        <TableCell key={o.key} className="text-end tabular-nums">
                          {d[o.key]}
                        </TableCell>
                      ))}
                      <TableCell className="text-end tabular-nums">
                        {d.p95Ms === null ? "None" : `${String(d.p95Ms)} ms`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.days} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={axisTick}
                      minTickGap={24}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={axisTick}
                      width={40}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                    <Legend itemSorter={null} wrapperStyle={{ fontSize: 12 }} />
                    {OUTCOMES.map((o, i) => (
                      <Bar
                        key={o.key}
                        dataKey={o.key}
                        name={o.label}
                        stackId="outcome"
                        fill={o.color}
                        radius={i === OUTCOMES.length - 1 ? [4, 4, 0, 0] : 0}
                        maxBarSize={32}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </FramePanel>
        </Frame>
        <Frame role="region" aria-labelledby="limits-heading">
          <FrameHeader className="px-4 py-3">
            <FrameTitle role="heading" aria-level={2} id="limits-heading">
              Rate limits
            </FrameTitle>
            <FrameDescription>Use in the window running now.</FrameDescription>
          </FrameHeader>
          <FramePanel className="flex flex-col gap-4 px-4 py-3">
            {metrics.buckets.map((b) => (
              <BucketUse key={b.bucket} {...b} />
            ))}
          </FramePanel>
        </Frame>
      </div>
      {metrics.routes.length > 0 ? (
        <Frame role="region" aria-labelledby="routes-heading">
          <FrameHeader className="px-4 py-3">
            <FrameTitle role="heading" aria-level={2} id="routes-heading">
              Busiest routes
            </FrameTitle>
          </FrameHeader>
          <FramePanel className="overflow-x-auto p-0">
            <Table aria-label="Busiest routes">
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-end">Requests</TableHead>
                  <TableHead className="text-end">Errors</TableHead>
                  <TableHead className="text-end">p95</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.routes.map((r) => (
                  <TableRow key={`${r.method} ${r.route}`}>
                    <TableCell className="font-mono text-xs">
                      {r.method} {r.route}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{r.requests}</TableCell>
                    <TableCell
                      className={cn(
                        "text-end tabular-nums",
                        r.errors > 0 && "text-destructive-foreground",
                      )}
                    >
                      {r.errors}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {r.p95Ms === null ? "None" : `${String(r.p95Ms)} ms`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </FramePanel>
        </Frame>
      ) : null}
    </>
  );
}

function BucketUse({
  bucket,
  used,
  limit,
  requests,
}: {
  bucket: ApiBucket;
  used: number;
  limit: number;
  requests: number;
}) {
  const share = limit ? Math.min(1, used / limit) : 0;
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="flex justify-between gap-2">
        <span className="font-medium">{BUCKET_LABEL[bucket].label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used} of {limit} {BUCKET_LABEL[bucket].per}
        </span>
      </span>
      <Meter
        value={share * 100}
        aria-label={`${BUCKET_LABEL[bucket].label}: ${String(used)} of ${String(limit)} used`}
      >
        <MeterTrack>
          <MeterIndicator
            className={cn(share >= 1 ? "bg-destructive" : share >= 0.8 ? "bg-warning" : undefined)}
          />
        </MeterTrack>
      </Meter>
      <span className="text-xs text-muted-foreground tabular-nums">{requests} in the period</span>
    </div>
  );
}
