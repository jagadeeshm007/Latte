import type { CallDetail, Finding, Me, RubricItem, Segment } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayIcon, RotateCwIcon } from "lucide-react";
import { useRef, useState } from "react";

import {
  CallStatusBadge,
  ErrorState,
  FindingBadge,
  Loading,
  PageHeader,
} from "@/components/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Group, GroupText } from "@/components/ui/group";
import { toastManager } from "@/components/ui/toast";
import { AddFindingDialog } from "@/features/review/AddFindingDialog";
import { CompleteReview, ReviewDecision } from "@/features/review/ReviewControls";
import { captionsUrl } from "@/lib/captions";
import { api, callQuery, meQuery } from "@/lib/endpoints";
import { formatClock, formatDate, IN_PROGRESS } from "@/lib/format";

// S4 and S6: one call with its evidence. Clicking a finding plays the
// recording from the cited moment (REQ-016); QA reviewers decide on each
// finding here (US-01-006). Related content sits in one Frame, related
// controls in one Group.

const TYPE_LABEL = {
  prohibited: "Prohibited statements",
  mandatory: "Mandatory items",
  quality: "Quality",
} as const;

export function CallDetailPage({ callId }: { callId: string }) {
  const me = useQuery(meQuery);
  const detail = useQuery({
    ...callQuery(callId),
    refetchInterval: (q) =>
      q.state.data && IN_PROGRESS.has(q.state.data.call.status) ? 3000 : false,
  });
  if (detail.isPending || me.isPending) return <Loading />;
  if (detail.isError) return <ErrorState error={detail.error} title="Could not open this call" />;
  if (me.isError) return <ErrorState error={me.error} />;
  // key: a new call id starts with a fresh player and review state.
  return <CallView key={callId} detail={detail.data} me={me.data} />;
}

function CallView({ detail, me }: { detail: CallDetail; me: Me }) {
  const { call, score } = detail;
  const audio = useRef<HTMLAudioElement>(null);
  const [nowMs, setNowMs] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  // When the signed URL stops working; a fresh one is fetched before then (review finding 6).
  const expiresAt = useRef(0);
  const queryClient = useQueryClient();
  const labels = new Map(detail.rubricItems.map((i) => [i.key, i]));
  const reviewing = me.role === "qa_reviewer" && call.reviewStatus === "pending";

  async function playAt(ms: number) {
    const el = audio.current;
    if (!el) return;
    setAudioError(null);
    try {
      if (!audioLoaded || Date.now() > expiresAt.current - 30_000) {
        const { url, expiresInSeconds } = await api.audioUrl(call.id);
        expiresAt.current = Date.now() + expiresInSeconds * 1000;
        el.src = url;
        await new Promise<void>((resolve, reject) => {
          el.addEventListener(
            "loadedmetadata",
            () => {
              resolve();
            },
            { once: true },
          );
          el.addEventListener(
            "error",
            () => {
              reject(new Error("The recording could not be loaded"));
            },
            { once: true },
          );
        });
        setAudioLoaded(true);
      }
      el.currentTime = ms / 1000;
      await el.play();
    } catch (e) {
      // A signed URL lasts 10 minutes; the next play asks for a fresh one.
      el.removeAttribute("src");
      setAudioLoaded(false);
      setAudioError(e instanceof Error ? e.message : "The recording could not be played");
    }
  }

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
    <div className="flex flex-col gap-4">
      <PageHeader
        title={call.originalFilename}
        description={`${call.agentName} · ${call.teamName} · ${call.productName} · ${formatDate(call.callDate)}`}
        actions={
          <Group aria-label="Call actions">
            {detail.audioAvailable && !audioLoaded ? (
              <Button variant="outline" size="sm" onClick={() => void playAt(0)}>
                <PlayIcon aria-hidden="true" />
                Load and play recording
              </Button>
            ) : null}
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
          </Group>
        }
      />

      <Group aria-label="Call summary" className="flex-wrap">
        <GroupText>
          <CallStatusBadge status={call.status} />
          {call.reviewStatus === "pending" ? <Badge variant="info">Needs review</Badge> : null}
          {call.reviewStatus === "done" ? (
            <Badge variant="secondary">
              Reviewed{score?.reviewedBy ? ` by ${score.reviewedBy}` : ""}
            </Badge>
          ) : null}
        </GroupText>
        {call.overallScore !== null ? (
          <GroupText>
            Score{" "}
            <strong className="text-foreground tabular-nums">
              {call.overallScore.toFixed(0)}%
            </strong>
          </GroupText>
        ) : null}
        {score ? (
          <GroupText>
            Agent talk ratio{" "}
            <strong className="text-foreground tabular-nums">
              {Math.round(score.talkRatio * 100)}%
            </strong>
          </GroupText>
        ) : null}
        {score ? <GroupText>Rubric v{score.rubricVersion}</GroupText> : null}
      </Group>

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

      <Frame>
        <FramePanel className="flex flex-col gap-1 px-3 py-2">
          {detail.audioAvailable ? (
            <audio
              ref={audio}
              controls
              preload="none"
              className="h-9 w-full"
              aria-label="Call recording"
              onTimeUpdate={(e) => {
                setNowMs(e.currentTarget.currentTime * 1000);
              }}
              onError={() => {
                // An expired or revoked URL: the next play fetches a fresh one.
                if (audioLoaded) {
                  setAudioLoaded(false);
                  setAudioError("The recording link expired; press play again");
                }
              }}
            >
              <track
                kind="captions"
                srcLang="en"
                label="Transcript"
                src={captionsUrl(detail.segments)}
                default
              />
            </audio>
          ) : (
            <p className="text-sm text-muted-foreground">
              The recording was deleted after its retention period. The transcript and findings
              remain.
            </p>
          )}
          {audioError ? (
            <p className="text-sm text-destructive" role="alert">
              {audioError}
            </p>
          ) : null}
        </FramePanel>
      </Frame>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Frame role="region" aria-labelledby="findings-heading">
          <FrameHeader className="flex-row items-center justify-between gap-2 px-4 py-2.5">
            <FrameTitle role="heading" aria-level={2} id="findings-heading">
              Findings
            </FrameTitle>
            {reviewing ? (
              <AddFindingDialog
                callId={call.id}
                items={detail.rubricItems}
                segments={detail.segments}
              />
            ) : null}
          </FrameHeader>
          {detail.findings.length === 0 ? (
            <FramePanel className="px-4 py-3 text-sm text-muted-foreground">
              No findings yet.
            </FramePanel>
          ) : null}
          {(["prohibited", "mandatory", "quality"] as const).map((type) => {
            const group = detail.findings.filter((f) => f.itemType === type);
            if (group.length === 0) return null;
            return (
              <FramePanel key={type} className="p-0">
                <h3 className="border-b px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                  {TYPE_LABEL[type]}
                </h3>
                <ul className="divide-y">
                  {group.map((f) => (
                    <FindingRow
                      key={f.id}
                      finding={f}
                      item={labels.get(f.itemKey)}
                      onPlay={playAt}
                      callId={call.id}
                      reviewing={reviewing}
                    />
                  ))}
                </ul>
              </FramePanel>
            );
          })}
          {score && score.coachingNotes.length > 0 ? (
            <FramePanel className="px-4 py-3">
              <h3 className="mb-1 text-xs font-medium text-muted-foreground uppercase">
                Coaching notes
              </h3>
              <ul className="list-disc space-y-0.5 ps-5 text-sm">
                {score.coachingNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </FramePanel>
          ) : null}
          {reviewing ? (
            <FrameFooter className="px-4 py-2.5">
              <CompleteReview callId={call.id} findings={detail.findings} />
            </FrameFooter>
          ) : null}
        </Frame>
        <Transcript
          segments={detail.segments}
          nowMs={nowMs}
          onPlay={playAt}
          canPlay={detail.audioAvailable}
        />
      </div>
    </div>
  );
}

function FindingRow({
  finding: f,
  item,
  onPlay,
  callId,
  reviewing,
}: {
  finding: Finding;
  item: RubricItem | undefined;
  onPlay: (ms: number) => Promise<void>;
  callId: string;
  reviewing: boolean;
}) {
  return (
    <li
      className={`flex flex-col gap-1.5 px-4 py-3 ${f.status === "breach" ? "bg-destructive/4" : ""}`}
    >
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
        <blockquote className="border-s-2 ps-2.5 text-sm whitespace-pre-line">
          <span className="text-xs text-muted-foreground uppercase">{f.channel}</span> {f.quote}
        </blockquote>
      ) : null}
      {f.rationale ? <p className="text-sm text-muted-foreground">{f.rationale}</p> : null}
      {f.review?.note ? <p className="text-sm whitespace-pre-line">Note: {f.review.note}</p> : null}
      {f.startMs !== null || reviewing ? (
        <div className="flex flex-wrap items-start gap-2">
          {f.startMs !== null ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => void onPlay(f.startMs ?? 0)}
              aria-label={`Play from ${formatClock(f.startMs)}`}
            >
              <PlayIcon aria-hidden="true" />
              {formatClock(f.startMs)}
            </Button>
          ) : null}
          {reviewing ? <ReviewDecision callId={callId} finding={f} /> : null}
        </div>
      ) : null}
    </li>
  );
}

function Transcript({
  segments,
  nowMs,
  onPlay,
  canPlay,
}: {
  segments: Segment[];
  nowMs: number;
  onPlay: (ms: number) => Promise<void>;
  canPlay: boolean;
}) {
  return (
    <Frame role="region" aria-labelledby="transcript-heading">
      <FrameHeader className="px-4 py-2.5">
        <FrameTitle role="heading" aria-level={2} id="transcript-heading">
          Transcript
        </FrameTitle>
      </FrameHeader>
      <FramePanel className="p-0">
        {segments.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">No transcript yet.</p>
        ) : null}
        <ol className="flex max-h-[70svh] flex-col overflow-y-auto py-1">
          {segments.map((s) => {
            const active = nowMs >= s.startMs && nowMs < s.endMs;
            const stamp = (
              <>
                {formatClock(s.startMs)}
                <span className="block font-sans text-xs uppercase">{s.channel}</span>
              </>
            );
            return (
              <li
                key={s.seq}
                className={`grid grid-cols-[4rem_1fr] gap-2 px-3 py-1 text-sm ${active ? "bg-accent" : ""} ${s.channel === "customer" ? "text-muted-foreground" : ""}`}
              >
                {canPlay ? (
                  <button
                    type="button"
                    className="self-start text-start font-mono text-xs tabular-nums underline-offset-4 hover:underline"
                    onClick={() => void onPlay(s.startMs)}
                  >
                    {stamp}
                  </button>
                ) : (
                  <span className="font-mono text-xs tabular-nums">{stamp}</span>
                )}
                <span className={(s.avgLogprob ?? 0) < -1 ? "opacity-70" : undefined}>
                  {s.text}
                </span>
              </li>
            );
          })}
        </ol>
      </FramePanel>
    </Frame>
  );
}
