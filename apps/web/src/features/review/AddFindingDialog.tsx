import { type RubricItem, type Segment, STATUSES_BY_TYPE } from "@scc/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { api, keys } from "@/lib/endpoints";
import { FINDING_LABEL, formatClock } from "@/lib/format";

/**
 * A reviewer records what the judge missed (Q-008); it counts as a judge
 * false negative in agreement, the metric that matters.
 */
export function AddFindingDialog({
  callId,
  items,
  segments,
}: {
  callId: string;
  items: RubricItem[];
  segments: Segment[];
}) {
  const [open, setOpen] = useState(false);
  const [itemKey, setItemKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [seq, setSeq] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const item = items.find((i) => i.key === itemKey);
  const statuses = item
    ? STATUSES_BY_TYPE[item.type].filter((s) => s !== "met" && s !== "clear")
    : [];

  const add = useMutation({
    mutationFn: () =>
      api.addFinding(callId, {
        itemKey: itemKey ?? "",
        status: status ?? "",
        ...(seq ? { segmentSeq: Number(seq) } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: async () => {
      setOpen(false);
      setItemKey(null);
      setStatus(null);
      setSeq(null);
      setNote("");
      toastManager.add({ type: "success", title: "Missed finding added" });
      await queryClient.invalidateQueries({ queryKey: keys.call(callId) });
    },
    onError: (e) => toastManager.add({ type: "error", title: "Not added", description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon aria-hidden="true" />
        Add missed finding
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Add a finding the judge missed</DialogTitle>
          <DialogDescription>
            It is saved as your decision and counted against the judge for this item.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Rubric item</FieldLabel>
            <OptionSelect
              label="Rubric item"
              value={itemKey}
              options={items.map((i) => ({ value: i.key, label: i.label }))}
              onChange={(v) => {
                setItemKey(v);
                setStatus(null);
              }}
            />
          </Field>
          <Field>
            <FieldLabel>What happened</FieldLabel>
            <OptionSelect
              label="Status"
              value={status}
              options={statuses.map((s) => ({ value: s, label: FINDING_LABEL[s] }))}
              onChange={setStatus}
            />
          </Field>
          <Field>
            <FieldLabel>Transcript line (optional)</FieldLabel>
            <OptionSelect
              label="Transcript line"
              value={seq}
              placeholder="No specific line"
              options={segments.map((s) => ({
                value: String(s.seq),
                label: `${formatClock(s.startMs)} ${s.channel}: ${s.text.slice(0, 60)}`,
              }))}
              onChange={setSeq}
            />
          </Field>
          <Field>
            <FieldLabel>Note</FieldLabel>
            <Textarea
              value={note}
              maxLength={2000}
              onChange={(e) => {
                setNote(e.target.value);
              }}
            />
          </Field>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button
            disabled={!itemKey || !status}
            loading={add.isPending}
            onClick={() => {
              add.mutate();
            }}
          >
            Add finding
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
