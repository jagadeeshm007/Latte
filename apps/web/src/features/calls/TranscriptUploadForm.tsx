import { LANGUAGES, MAX_BATCH_FILES, MAX_UPLOAD_FILES, type Reference } from "@scc/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ClipboardPasteIcon, FilePlusIcon, UploadIcon, XIcon } from "lucide-react";
import { useId, useState, type ChangeEvent } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Group, GroupText } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { api } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

import { isTimed, readText, rowFromText, rowProblem, type TranscriptRow } from "./transcript-rows";

// Upload calls as transcripts, with no audio (ADR-0030): .txt or .json files,
// or pasted text, read in the browser and sent in chunks as one batch.

const today = () => new Date().toISOString().slice(0, 10);
const languages = LANGUAGES.filter((l) => l.code !== "auto").map((l) => ({
  value: l.code,
  label: l.label,
}));
const isLanguage = (v: string): v is TranscriptRow["language"] =>
  languages.some((l) => l.value === v);
let nextKey = 0;
const keyFor = (name: string) => `${name}-${String(nextKey++)}`;

export function TranscriptUploadForm({ reference }: { reference: Reference }) {
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchName, setBatchName] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const inputId = useId();
  const pasteId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const update = (key: string | null, patch: Partial<TranscriptRow>) => {
    setRows((current) =>
      current.map((r) => (key === null || r.key === key ? { ...r, ...patch } : r)),
    );
  };
  const add = (added: TranscriptRow[]) => {
    setError(null);
    setRows((current) => {
      const room = MAX_BATCH_FILES - current.length;
      if (added.length > room) setError(`At most ${String(MAX_BATCH_FILES)} calls per batch.`);
      return [...current, ...added.slice(0, Math.max(0, room))];
    });
  };

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    add(
      await Promise.all(
        picked.map(async (f) => rowFromText(f.name, await readText(f), keyFor(f.name))),
      ),
    );
  }

  const problems = rows.map(rowProblem);
  const ready = rows.length > 0 && problems.every((p) => p === null);

  async function upload() {
    setBusy(true);
    setError(null);
    let joined = batchId;
    const uploaded = new Set<string>();
    try {
      // The first request makes the batch; the rest join it.
      for (let at = 0; at < rows.length; at += MAX_UPLOAD_FILES) {
        const chunk = rows.slice(at, at + MAX_UPLOAD_FILES);
        const result = await api.uploadTranscripts({
          ...(joined
            ? { batchId: joined }
            : batchName.trim()
              ? { batchName: batchName.trim() }
              : {}),
          transcripts: chunk.map((r) => ({
            originalFilename: r.name,
            agentId: r.agentId ?? "",
            teamId: r.teamId ?? "",
            productId: r.productId ?? "",
            callDate: r.callDate,
            language: r.language,
            lines: r.lines,
          })),
        });
        joined = result.batchId;
        for (const r of chunk) uploaded.add(r.key);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Upload failed. Nothing more was saved; try again.",
      );
    }
    setBusy(false);
    if (uploaded.size > 0) {
      await queryClient.invalidateQueries({ queryKey: ["calls"] });
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
    }
    if (joined && uploaded.size === rows.length) {
      toastManager.add({
        type: "success",
        title: `${String(uploaded.size)} transcript${uploaded.size > 1 ? "s" : ""} uploaded`,
        description: "Scoring has started; you will be notified when the batch finishes.",
      });
      await navigate({ to: "/batches/$batchId", params: { batchId: joined } });
      return;
    }
    // Keep what still needs sending; the next try joins the same batch.
    setRows((current) => current.filter((r) => !uploaded.has(r.key)));
    setBatchId(joined);
  }

  const agents = reference.agents.map((a) => ({
    value: a.id,
    label: a.externalCode ? `${a.name} (${a.externalCode})` : a.name,
  }));
  const teams = reference.teams.map((t) => ({ value: t.id, label: t.name }));
  const products = reference.products.map((p) => ({ value: p.id, label: p.name }));

  return (
    <Frame>
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Group aria-label="Transcripts">
          <label
            htmlFor={inputId}
            data-slot="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "cursor-pointer focus-within:ring-2 focus-within:ring-ring",
            )}
          >
            <FilePlusIcon aria-hidden="true" />
            Choose transcripts
            <input
              id={inputId}
              type="file"
              accept=".txt,.json,text/plain,application/json"
              multiple
              className="sr-only"
              onChange={(e) => void onFiles(e)}
              disabled={busy || rows.length >= MAX_BATCH_FILES}
            />
          </label>
          <GroupText className="h-8 sm:h-7">
            {rows.length} of {MAX_BATCH_FILES}
          </GroupText>
        </Group>
        <Button size="sm" disabled={!ready} loading={busy} onClick={() => void upload()}>
          <UploadIcon aria-hidden="true" />
          Upload{" "}
          {rows.length > 0 ? `${String(rows.length)} transcript${rows.length > 1 ? "s" : ""}` : ""}
        </Button>
      </FrameHeader>

      <FramePanel className="flex flex-col gap-2 px-4 py-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={pasteId} className="text-xs font-medium text-muted-foreground">
            Or paste one
          </label>
          <Textarea
            id={pasteId}
            rows={4}
            value={pasted}
            disabled={busy}
            placeholder={
              "Agent: Good morning, this is Ravi from Suraksha.\nCustomer: Hi.\n[00:41] Agent: …"
            }
            onChange={(e) => {
              setPasted(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            One turn per line, labelled Agent: or Customer:, with an optional time like [00:41]. Or
            JSON: a list of {"{ speaker, text, startMs, endMs }"}.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !pasted.trim()}
            onClick={() => {
              add([rowFromText(`Pasted ${String(rows.length + 1)}.txt`, pasted, keyFor("pasted"))]);
              setPasted("");
            }}
          >
            <ClipboardPasteIcon aria-hidden="true" />
            Add pasted transcript
          </Button>
        </div>
      </FramePanel>

      {rows.length > 0 ? (
        <FramePanel className="flex flex-wrap items-end gap-3 px-4 py-3">
          <label className="flex w-full flex-col gap-1 text-xs font-medium text-muted-foreground sm:w-64">
            {batchId ? "Adding to the batch already started" : "Batch name"}
            <Input
              size="sm"
              placeholder="e.g. Dialler export, week 42"
              value={batchName}
              maxLength={120}
              disabled={busy || batchId !== null}
              onChange={(e) => {
                setBatchName(e.target.value);
              }}
            />
          </label>
          {rows.length > 1 ? (
            <Group aria-label="Set for every transcript" className="flex-wrap">
              <GroupText className="h-8 sm:h-7">For every transcript</GroupText>
              <OptionSelect
                size="sm"
                label="Agent for every transcript"
                placeholder="Agent"
                value={null}
                options={agents}
                className="w-44"
                onChange={(agentId) => {
                  const teamId = reference.agents.find((a) => a.id === agentId)?.teamId ?? null;
                  update(null, { agentId, ...(teamId ? { teamId } : {}) });
                }}
              />
              <OptionSelect
                size="sm"
                label="Product for every transcript"
                placeholder="Product"
                value={null}
                options={products}
                className="w-40"
                onChange={(productId) => {
                  update(null, { productId });
                }}
              />
              <OptionSelect
                size="sm"
                label="Language for every transcript"
                placeholder="Language"
                value={null}
                options={languages}
                className="w-40"
                onChange={(value) => {
                  if (isLanguage(value)) update(null, { language: value });
                }}
              />
              <Input
                type="date"
                size="sm"
                aria-label="Call date for every transcript"
                max={today()}
                className="w-40"
                onChange={(e) => {
                  if (e.target.value) update(null, { callDate: e.target.value });
                }}
              />
            </Group>
          ) : null}
        </FramePanel>
      ) : null}

      {error ? (
        <Alert variant="error" className="mb-1" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {rows.length > 0 ? (
        <FramePanel className="p-0">
          <Table aria-label="Transcripts to upload">
            <TableHeader>
              <TableRow>
                <TableHead>Transcript</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Call date</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.key}>
                  <TableCell className="max-w-56">
                    <span className="block truncate font-medium">{r.name}</span>
                    {r.parseError ? null : (
                      <span className="block text-xs text-muted-foreground">
                        {r.lines.length} lines,{" "}
                        {isTimed(r) ? "with times" : "no times: shown by line"}
                      </span>
                    )}
                    {problems[i] || r.error ? (
                      <span className="mt-1 block text-xs text-destructive-foreground">
                        {problems[i] ?? r.error}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <OptionSelect
                      size="sm"
                      label={`Agent for ${r.name}`}
                      value={r.agentId}
                      options={agents}
                      onChange={(agentId) => {
                        update(r.key, {
                          agentId,
                          teamId:
                            reference.agents.find((a) => a.id === agentId)?.teamId ?? r.teamId,
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <OptionSelect
                      size="sm"
                      label={`Team for ${r.name}`}
                      value={r.teamId}
                      options={teams}
                      onChange={(teamId) => {
                        update(r.key, { teamId });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <OptionSelect
                      size="sm"
                      label={`Product for ${r.name}`}
                      value={r.productId}
                      options={products}
                      onChange={(productId) => {
                        update(r.key, { productId });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      aria-label={`Call date for ${r.name}`}
                      value={r.callDate}
                      max={today()}
                      onChange={(e) => {
                        update(r.key, { callDate: e.target.value });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <OptionSelect
                      size="sm"
                      label={`Language of ${r.name}`}
                      value={r.language}
                      options={languages}
                      onChange={(value) => {
                        if (isLanguage(value)) update(r.key, { language: value });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${r.name}`}
                      disabled={busy}
                      onClick={() => {
                        setRows((current) => current.filter((x) => x.key !== r.key));
                      }}
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </FramePanel>
      ) : null}
    </Frame>
  );
}
