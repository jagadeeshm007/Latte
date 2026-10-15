import type { CallSummary } from "@scc/shared";
import { Link } from "@tanstack/react-router";

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
import { formatClock, formatDate } from "@/lib/format";

/** The list of calls used by the call list, the QA queue and the scorecard. */
export function CallsTable({
  calls,
  showAgent = true,
}: {
  calls: CallSummary[];
  showAgent?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Call</TableHead>
          {showAgent ? <TableHead>Agent</TableHead> : null}
          <TableHead>Product</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-end">Score</TableHead>
          <TableHead>Flags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {calls.map((c) => (
          <TableRow key={c.id}>
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
              </span>
            </TableCell>
            {showAgent ? (
              <TableCell>
                {c.agentName}
                <span className="block text-xs text-muted-foreground">{c.teamName}</span>
              </TableCell>
            ) : null}
            <TableCell>{c.productName}</TableCell>
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
              <div className="flex flex-wrap gap-1">
                {c.breaches > 0 ? (
                  <Badge variant="error">
                    {c.breaches} breach{c.breaches > 1 ? "es" : ""}
                  </Badge>
                ) : null}
                {c.missed > 0 ? <Badge variant="warning">{c.missed} missed</Badge> : null}
                {c.reviewStatus === "pending" ? <Badge variant="info">Needs review</Badge> : null}
                {c.reviewStatus === "done" ? <Badge variant="secondary">Reviewed</Badge> : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
