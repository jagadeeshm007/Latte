import type { Finding } from "@scc/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Group, GroupText } from "@/components/ui/group";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { api, keys } from "@/lib/endpoints";

// QA decisions on findings (REQ-018). After each change the call and the
// queue are refetched; the cache stays the only copy of server data.

function useRefresh(callId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.call(callId) }),
      queryClient.invalidateQueries({ queryKey: keys.queue }),
      queryClient.invalidateQueries({ queryKey: keys.agreement }),
      queryClient.invalidateQueries({ queryKey: ["calls", "list"] }),
    ]);
  };
}

export function ReviewDecision({ callId, finding }: { callId: string; finding: Finding }) {
  const refresh = useRefresh(callId);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(finding.review?.note ?? "");
  const decide = useMutation({
    mutationFn: (decision: "agree" | "disagree") =>
      api.decide(finding.id, decision, note.trim() || undefined),
    onSuccess: refresh,
    onError: (e) =>
      toastManager.add({ type: "error", title: "Decision not saved", description: e.message }),
  });
  const current = finding.review?.decision;
  return (
    <div className="flex flex-col gap-1.5">
      <Group aria-label="Your decision">
        <Button
          size="xs"
          variant={current === "agree" ? "default" : "outline"}
          aria-pressed={current === "agree"}
          disabled={decide.isPending}
          onClick={() => {
            decide.mutate("agree");
          }}
        >
          <CheckIcon aria-hidden="true" />
          Agree
        </Button>
        <Button
          size="xs"
          variant={current === "disagree" ? "destructive" : "outline"}
          aria-pressed={current === "disagree"}
          disabled={decide.isPending}
          onClick={() => {
            decide.mutate("disagree");
          }}
        >
          <XIcon aria-hidden="true" />
          Disagree
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            setNoteOpen((o) => !o);
          }}
          aria-expanded={noteOpen}
        >
          {noteOpen ? "Hide note" : "Add note"}
        </Button>
      </Group>
      {noteOpen ? (
        <Textarea
          aria-label="Reviewer note"
          placeholder="Why you agree or disagree (saved with your decision)"
          value={note}
          maxLength={2000}
          size="sm"
          onChange={(e) => {
            setNote(e.target.value);
          }}
        />
      ) : null}
    </div>
  );
}

export function CompleteReview({ callId, findings }: { callId: string; findings: Finding[] }) {
  const refresh = useRefresh(callId);
  const undecided = findings.filter((f) => !f.review).length;
  const complete = useMutation({
    mutationFn: () => api.completeReview(callId),
    onSuccess: async () => {
      toastManager.add({
        type: "success",
        title: "Review complete",
        description: "The call has left the queue.",
      });
      await refresh();
    },
    onError: (e) =>
      toastManager.add({
        type: "error",
        title: "Could not complete the review",
        description: e.message,
      }),
  });
  return (
    <Group aria-label="Review">
      <GroupText role="status">
        {undecided > 0
          ? `${String(undecided)} finding${undecided > 1 ? "s" : ""} still need a decision`
          : "Every finding has a decision"}
      </GroupText>
      <Button
        disabled={undecided > 0}
        loading={complete.isPending}
        onClick={() => {
          complete.mutate();
        }}
      >
        Complete review
      </Button>
    </Group>
  );
}
