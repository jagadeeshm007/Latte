import type { CallDetail, Me } from "@scc/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCwIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { CallStatusBadge, ErrorState, Loading, PageHeader } from "@/components/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { load, seek, usePlayer } from "@/features/player/player-store";
import { captionsUrl } from "@/lib/captions";
import { api, callQuery, meQuery } from "@/lib/endpoints";
import { formatDate, IN_PROGRESS, languageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

import { AnalysingCard, CoachingNotesCard } from "./CoachingNotes";
import { DownloadMenu } from "./DownloadMenu";
import { FindingsPanel } from "./FindingsPanel";
import { LyricsTranscript } from "./LyricsTranscript";
import { PiiNotice } from "./PiiNotice";
import { PlayerPanel } from "./PlayerPanel";

// S4 and S6: one call with its evidence. Clicking a finding plays the
// recording from the cited moment (REQ-016); QA reviewers decide on each
// finding here (US-01-006). Related content sits in one Frame, related
// controls in one Group.

export function CallDetailPage({ callId }: { callId: string }) {
  const me = useQuery(meQuery);
  // Held against the call, so opening another call never shows its personal data unasked.
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  const reveal = revealedFor === callId;
  const detail = useQuery({
    ...callQuery(callId, reveal),
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      q.state.data && IN_PROGRESS.has(q.state.data.call.status) ? 3000 : false,
  });
  if (detail.isPending || me.isPending) return <Loading label="Loading the call" shape="call" />;
  if (detail.isError) return <ErrorState error={detail.error} title="Could not open this call" />;
  if (me.isError) return <ErrorState error={me.error} />;
  // key: a new call id starts with a fresh player and review state.
  return (
    <CallView
      key={callId}
      detail={detail.data}
      me={me.data}
      pii={{
        revealed: reveal,
        onToggle: () => {
          setRevealedFor(reveal ? null : callId);
        },
      }}
    />
  );
}

function CallView({
  detail,
  me,
  pii,
}: {
  detail: CallDetail;
  me: Me;
  pii: { revealed: boolean; onToggle: () => void };
}) {
  const { call, score } = detail;
  const [hoveredSeq, setHoveredSeq] = useState<number | null>(null);
  // Coaching notes stay hidden until someone asks for the AI analysis.
  const [analysis, setAnalysis] = useState<"idle" | "running" | "done">("idle");
  const isThis = usePlayer((s) => s.now?.callId === call.id);
  const positionMs = usePlayer((s) => (isThis ? s.positionMs : 0));
  const playing = usePlayer((s) => isThis && s.status === "playing");
  const queryClient = useQueryClient();
  const reviewing = me.role === "qa_reviewer" && call.reviewStatus === "pending";
  const breaches = detail.findings.filter((f) => f.status === "breach").length;

  // Opening a call loads its recording into the app-wide player, paused, so Play
  // works at once; a call already playing elsewhere carries on from where it was.
  useEffect(() => {
    if (!detail.audioAvailable) return;
    void load({
      callId: call.id,
      title: call.originalFilename,
      subtitle: `${call.agentName} · ${call.productName}`,
      captions: captionsUrl(detail.segments),
    });
  }, [
    detail.audioAvailable,
    detail.segments,
    call.id,
    call.originalFilename,
    call.agentName,
    call.productName,
  ]);

  const playFrom = (ms: number) => {
    seek(ms, true);
  };

  const retry = useMutation({
    mutationFn: () => api.retry(call.id),
    onSuccess: async () => {
      toastManager.add({ type: "success", title: "Queued again" });
      await queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
    onError: (e) =>
      toastManager.add({ type: "error", title: "Could not retry", description: e.message }),
  });
  const canRetry =
    me.role !== "agent" &&
    (call.status === "failed" ||
      (call.status === "scored" && call.judgeStatus === "failed" && call.reviewStatus !== "done"));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={call.originalFilename}
        description={`${call.agentName} · ${call.teamName} · ${call.productName} · ${formatDate(call.callDate)}`}
        actions={
          <>
            {call.overallScore !== null || score ? (
              <dl
                aria-label="Call summary"
                className="flex items-stretch divide-x rounded-lg border bg-card text-center shadow-xs/5"
              >
                {[
                  [
                    "Score",
                    call.overallScore === null ? "Unscored" : `${call.overallScore.toFixed(0)}%`,
                  ],
                  ["Talk ratio", score ? `${String(Math.round(score.talkRatio * 100))}%` : "None"],
                  ["Breaches", String(breaches)],
                  ["Rubric", score ? `v${String(score.rubricVersion)}` : "None"],
                ].map(([term, value]) => (
                  <div key={term} className="px-3 py-1">
                    <dt className="text-xs text-muted-foreground">{term}</dt>
                    <dd
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        term === "Breaches" && breaches > 0 && "text-destructive-foreground",
                      )}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={!score || analysis === "running"}
              loading={analysis === "running"}
              onClick={() => {
                setAnalysis("running");
              }}
            >
              <SparklesIcon aria-hidden="true" />
              AI Analyse
            </Button>
            <DownloadMenu detail={detail} />
            {canRetry ? (
              <Button
                variant="outline"
                size="sm"
                loading={retry.isPending}
                onClick={() => {
                  retry.mutate();
                }}
              >
                <RotateCwIcon aria-hidden="true" />
                Retry
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Call status">
          <CallStatusBadge status={call.status} />
          <Badge variant="outline">{languageLabel(call.language)}</Badge>
          {call.reviewStatus === "pending" ? <Badge variant="info">Needs review</Badge> : null}
          {call.reviewStatus === "done" ? (
            <Badge variant="secondary">
              Reviewed{score?.reviewedBy ? ` by ${score.reviewedBy}` : ""}
            </Badge>
          ) : null}
        </div>
      </PageHeader>
      <PiiNotice
        redactions={detail.redactions}
        revealed={pii.revealed}
        canReveal={me.role === "qa_reviewer" || me.role === "manager"}
        onToggle={pii.onToggle}
      />

      {call.error || IN_PROGRESS.has(call.status) || score?.judgeError ? (
        <div className="flex flex-col gap-2">
          {call.error ? (
            <Alert variant="error">
              <AlertTitle>This call failed</AlertTitle>
              <AlertDescription>{call.error}</AlertDescription>
            </Alert>
          ) : null}
          {IN_PROGRESS.has(call.status) ? (
            <Alert variant="info" role="status">
              <AlertTitle>
                {call.status === "scoring"
                  ? "Scoring the transcript"
                  : "Transcribing the recording"}
              </AlertTitle>
              <AlertDescription>
                This page updates by itself when the call is ready.
              </AlertDescription>
            </Alert>
          ) : null}
          {score?.judgeError ? (
            <Alert variant="warning">
              <AlertTitle>Unscored: the judge could not score this call</AlertTitle>
              <AlertDescription>
                {score.judgeError}. Phrase rules still ran; review the transcript by hand.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {analysis === "running" ? (
        <AnalysingCard
          onDone={() => {
            setAnalysis("done");
          }}
        />
      ) : null}
      {analysis === "done" && score ? <CoachingNotesCard notes={score.coachingNotes} /> : null}

      <PlayerPanel detail={detail} hoveredSeq={hoveredSeq} onHover={setHoveredSeq} />
      <LyricsTranscript
        segments={detail.segments}
        nowMs={positionMs}
        playing={playing}
        canPlay={detail.audioAvailable}
        onPlay={playFrom}
      />
      <FindingsPanel detail={detail} reviewing={reviewing} onPlay={playFrom} />
    </div>
  );
}
