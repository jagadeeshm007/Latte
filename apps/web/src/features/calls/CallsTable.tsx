import type { CallGroup, CallSummary, Role } from "@scc/shared";
import { Link } from "@tanstack/react-router";
import { ClockIcon, ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";
import { Fragment } from "react";

import { CallStatusBadge } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatClock, formatDate, languageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

import { CallActions } from "./CallActions";
import { FLAG_LABEL, groupOf } from "./calls-search";

const FLAG_STYLE = {
  flagged: { icon: ShieldAlertIcon, tone: "text-destructive-foreground bg-destructive/10" },
  passed: { icon: ShieldCheckIcon, tone: "text-success-foreground bg-success/10" },
  pending: { icon: ClockIcon, tone: "text-muted-foreground bg-muted" },
} as const;

/** FlagMark: a shield in red or green, or a clock while the call is still being processed. */
export function FlagMark({ call }: { call: CallSummary }) {
  const { icon: Icon, tone } = FLAG_STYLE[call.flag];
  const why = [
    call.breaches > 0 ? `${String(call.breaches)} breach${call.breaches > 1 ? "es" : ""}` : null,
    call.missed > 0 ? `${String(call.missed)} missed` : null,
    call.reviewStatus === "pending" ? "needs review" : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <span
      title={why ? `${FLAG_LABEL[call.flag]}: ${why}` : FLAG_LABEL[call.flag]}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {FLAG_LABEL[call.flag]}
    </span>
  );
}

/** The list of calls used by the call list, the QA queue and the scorecard. */
export function CallsTable({
  calls,
  showAgent = true,
  groupBy,
  role,
}: {
  calls: CallSummary[];
  showAgent?: boolean;
  /** Adds a header row each time the group changes; the list arrives ordered by it. */
  groupBy?: CallGroup | undefined;
  /** Shows the row actions for QA and managers. */
  role?: Role | undefined;
}) {
  const actions = role === "qa_reviewer" || role === "manager";
  const columns = 6 + (showAgent ? 1 : 0) + (actions ? 1 : 0);
  const counts = new Map<string, number>();
  if (groupBy)
    for (const c of calls)
      counts.set(groupOf(c, groupBy), (counts.get(groupOf(c, groupBy)) ?? 0) + 1);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Call</TableHead>
          {showAgent ? <TableHead>Agent</TableHead> : null}
          <TableHead>Product</TableHead>
          <TableHead>Language</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-end">Score</TableHead>
          <TableHead>Flag</TableHead>
          {actions ? (
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {calls.map((c, i) => {
          const group = groupBy ? groupOf(c, groupBy) : null;
          const prev = calls[i - 1];
          const prevGroup = prev && groupBy ? groupOf(prev, groupBy) : null;
          const startsGroup = group !== null && prevGroup !== group;
          return (
            <Fragment key={c.id}>
              {startsGroup ? (
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={columns} className="py-1.5 text-xs font-semibold">
                    {group}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {counts.get(group)} on this page
                    </span>
                  </TableCell>
                </TableRow>
              ) : null}
              <TableRow className={cn(c.archivedAt && "text-muted-foreground")}>
                <TableCell>
                  <Link
                    to="/calls/$callId"
                    params={{ callId: c.id }}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {c.originalFilename}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(c.callDate)}
                    {c.durationMs ? ` · ${formatClock(c.durationMs)}` : ""}
                    {c.archivedAt ? " · Archived" : ""}
                  </span>
                </TableCell>
                {showAgent ? (
                  <TableCell>
                    {c.agentName}
                    <span className="block text-xs text-muted-foreground">{c.teamName}</span>
                  </TableCell>
                ) : null}
                <TableCell>{c.productName}</TableCell>
                <TableCell className="text-muted-foreground">{languageLabel(c.language)}</TableCell>
                <TableCell>
                  <CallStatusBadge status={c.status} />
                  {c.error ? (
                    <span className="mt-1 block max-w-56 text-xs text-destructive">{c.error}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {c.overallScore === null
                    ? c.judgeStatus === "failed"
                      ? "Unscored"
                      : ""
                    : `${c.overallScore.toFixed(0)}%`}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <FlagMark call={c} />
                    {c.reviewStatus === "done" ? <Badge variant="secondary">Reviewed</Badge> : null}
                  </div>
                </TableCell>
                {actions ? (
                  <TableCell className="w-10 text-end">
                    <CallActions call={c} role={role} />
                  </TableCell>
                ) : null}
              </TableRow>
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
