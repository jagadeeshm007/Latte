import type { CallDetail, Finding, FindingStatus, RubricItem } from "@scc/shared";
import {
  CircleCheckIcon,
  CircleMinusIcon,
  CircleXIcon,
  PlayIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";

import { FindingBadge } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AddFindingDialog } from "@/features/review/AddFindingDialog";
import { CompleteReview, ReviewDecision } from "@/features/review/ReviewControls";
import { formatAt } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_LABEL = {
  prohibited: "Prohibited statements",
  mandatory: "Mandatory items",
  quality: "Quality",
} as const;

/** Breaches and misses first: the order a reviewer works in. */
const RANK: Record<FindingStatus, number> = {
  breach: 0,
  missed: 1,
  partial: 2,
  met: 3,
  clear: 3,
  not_applicable: 4,
};

const STATUS_ICON: Record<FindingStatus, { icon: typeof CircleXIcon; tone: string }> = {
  breach: { icon: CircleXIcon, tone: "text-destructive-foreground" },
  missed: { icon: CircleXIcon, tone: "text-destructive-foreground" },
  partial: { icon: TriangleAlertIcon, tone: "text-warning-foreground" },
  met: { icon: CircleCheckIcon, tone: "text-success-foreground" },
  clear: { icon: CircleCheckIcon, tone: "text-success-foreground" },
  not_applicable: { icon: CircleMinusIcon, tone: "text-muted-foreground" },
};

type Show = "all" | "attention" | "passed";
const needsAttention = (f: Finding) => RANK[f.status] <= 2;

/**
 * FindingsPanel: what the judge and QA found, grouped by rubric type with the
 * findings that need attention first. Each quote plays the recording from
 * its moment; QA reviewers decide on each finding here (US-01-006).
 */
export function FindingsPanel({
  detail,
  reviewing,
  onPlay,
}: {
  detail: CallDetail;
  reviewing: boolean;
  onPlay: (ms: number) => void;
}) {
  const [show, setShow] = useState<Show>("all");
  const labels = new Map(detail.rubricItems.map((i) => [i.key, i]));
  const attention = detail.findings.filter(needsAttention).length;
  const passed = detail.findings.filter((f) => f.status === "met" || f.status === "clear").length;
  const shown = detail.findings.filter((f) =>
    show === "all" ? true : show === "attention" ? needsAttention(f) : !needsAttention(f),
  );

  return (
    <Frame role="region" aria-labelledby="findings-heading" className="min-w-0">
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <FrameTitle role="heading" aria-level={2} id="findings-heading">
            Findings
          </FrameTitle>
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive-foreground">{attention} need attention</span> ·{" "}
            <span className="text-success-foreground">{passed} passed</span> ·{" "}
            {detail.findings.length} in all
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label="Show findings"
            value={[show]}
            onValueChange={(v: unknown[]) => {
              if (v[0] === "all" || v[0] === "attention" || v[0] === "passed") setShow(v[0]);
            }}
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="attention">Needs attention</ToggleGroupItem>
            <ToggleGroupItem value="passed">Passed</ToggleGroupItem>
          </ToggleGroup>
          {reviewing ? (
            <AddFindingDialog
              callId={detail.call.id}
              items={detail.rubricItems}
              segments={detail.segments}
              timed={detail.call.timed}
            />
          ) : null}
        </div>
      </FrameHeader>
      {shown.length === 0 ? (
        <FramePanel className="px-4 py-3 text-sm text-muted-foreground">
          {detail.findings.length === 0 ? "No findings yet." : "Nothing in this view."}
        </FramePanel>
      ) : null}
      {(["prohibited", "mandatory", "quality"] as const).map((type) => {
        const group = shown
          .filter((f) => f.itemType === type)
          .sort((a, b) => RANK[a.status] - RANK[b.status]);
        if (group.length === 0) return null;
        return (
          <FramePanel key={type} className="p-0">
            <h3 className="flex items-center justify-between border-b px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {TYPE_LABEL[type]}
              <span className="font-mono tabular-nums">{group.length}</span>
            </h3>
            <ul className="flex flex-col gap-2 p-2">
              {group.map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  item={labels.get(f.itemKey)}
                  onPlay={onPlay}
                  callId={detail.call.id}
                  reviewing={reviewing}
                  timed={detail.call.timed}
                  playable={detail.audioAvailable}
                />
              ))}
            </ul>
          </FramePanel>
        );
      })}
      {reviewing ? (
        <FrameFooter className="px-4 py-3">
          <CompleteReview callId={detail.call.id} findings={detail.findings} />
        </FrameFooter>
      ) : null}
    </Frame>
  );
}

function FindingCard({
  finding: f,
  item,
  onPlay,
  callId,
  reviewing,
  timed,
  playable,
}: {
  timed: boolean;
  playable: boolean;
  finding: Finding;
  item: RubricItem | undefined;
  onPlay: (ms: number) => void;
  callId: string;
  reviewing: boolean;
}) {
  const { icon: Icon, tone } = STATUS_ICON[f.status];
  return (
    <li
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-3",
        f.status === "breach" && "border-destructive/40 bg-destructive/4",
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", tone)} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="me-1 text-sm font-medium">{item?.label ?? f.itemKey}</span>
          <FindingBadge status={f.status} />
          {f.source === "rule" ? <Badge variant="outline">Phrase rule</Badge> : null}
          {f.source === "reviewer" ? <Badge variant="outline">Added by QA</Badge> : null}
          {!f.grounded ? <Badge variant="warning">Not grounded</Badge> : null}
          {f.review ? (
            <Badge variant={f.review.decision === "agree" ? "success" : "error"}>
              QA {f.review.decision === "agree" ? "agrees" : "disagrees"} ({f.review.reviewerName})
            </Badge>
          ) : null}
        </div>
        {f.quote ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <Where
              finding={f}
              timed={timed}
              playable={playable}
              onPlay={onPlay}
              className="shrink-0"
            />
            <blockquote className="text-sm whitespace-pre-line">
              <span className="me-1 text-xs text-muted-foreground uppercase">{f.channel}</span>
              {f.quote}
            </blockquote>
          </div>
        ) : (
          <Where
            finding={f}
            timed={timed}
            playable={playable}
            onPlay={onPlay}
            className="self-start"
          />
        )}
        {f.rationale ? <p className="text-sm text-muted-foreground">{f.rationale}</p> : null}
        {f.review?.note ? (
          <p className="text-sm whitespace-pre-line">Note: {f.review.note}</p>
        ) : null}
        {reviewing ? <ReviewDecision callId={callId} finding={f} /> : null}
      </div>
    </li>
  );
}

/** Where a finding sits: a play button on a recording, a plain label on a transcript upload. */
function Where({
  finding: f,
  timed,
  playable,
  onPlay,
  className,
}: {
  finding: Finding;
  timed: boolean;
  playable: boolean;
  onPlay: (ms: number) => void;
  className: string;
}) {
  if (f.startMs === null || (!timed && f.segmentSeq === null)) return null;
  const at = formatAt(f.startMs, f.segmentSeq ?? 0, timed);
  if (!playable) {
    return (
      <Badge variant="outline" className={cn("tabular-nums", className)}>
        {at}
      </Badge>
    );
  }
  return (
    <Button
      variant="outline"
      size="xs"
      className={className}
      onClick={() => {
        onPlay(f.startMs ?? 0);
      }}
      aria-label={`Play from ${at}`}
    >
      <PlayIcon aria-hidden="true" />
      {at}
    </Button>
  );
}
