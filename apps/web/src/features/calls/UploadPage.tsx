import { ENGLISH, LANGUAGES, languageSchema, MAX_BATCH_FILES, type Reference } from "@scc/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FilePlusIcon, UploadCloudIcon, UploadIcon, XIcon } from "lucide-react";
import { useId, useState, type ChangeEvent, type ReactNode } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { PageNav } from "@/components/PageNav";
import { ErrorState, Loading, PageHeader } from "@/components/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Group, GroupText } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, referenceQuery } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

import { TranscriptUploadForm } from "./TranscriptUploadForm";
import { uploadInChunks } from "./upload-batch";
import { mimeOf, type Row, rowProblem } from "./upload-rules";

// S3: pick up to 500 stereo recordings, give each its agent, team, product,
// date and language (one by one or for every file at once), and upload them
// as one named batch, in chunks straight to private storage (US-01-001,
// ADR-0017).

function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (p: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${String(xhr.status)})`));
    };
    xhr.onerror = () => {
      reject(new Error("Upload failed: network error"));
    };
    xhr.send(file);
  });
}

const today = () => new Date().toISOString().slice(0, 10);
/** Rows shown per page of the file table; a batch can hold 500. */
const ROWS_PER_PAGE = 50;

type UploadMode = "audio" | "transcript";

export function UploadPage() {
  const reference = useQuery(referenceQuery);
  const [mode, setMode] = useState<UploadMode>("audio");
  if (reference.isPending) return <Loading label="Loading the upload form" />;
  if (reference.isError) return <ErrorState error={reference.error} />;
  const switcher = (
    <ToggleGroup
      variant="outline"
      size="sm"
      aria-label="What to upload"
      value={[mode]}
      onValueChange={(v: unknown[]) => {
        if (v[0] === "audio" || v[0] === "transcript") setMode(v[0]);
      }}
    >
      <ToggleGroupItem value="audio">Recordings</ToggleGroupItem>
      <ToggleGroupItem value="transcript">Transcripts</ToggleGroupItem>
    </ToggleGroup>
  );
  if (mode === "transcript") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Upload calls"
          description="Transcripts from a dialler or CRM, with no audio: .txt or .json files, or pasted text. Each is scored like a recording."
          actions={switcher}
        />
        <TranscriptUploadForm reference={reference.data} />
      </div>
    );
  }
  return <UploadForm reference={reference.data} actions={switcher} />;
}

export function UploadForm({ reference, actions }: { reference: Reference; actions?: ReactNode }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [batchName, setBatchName] = useState("");
  // Set after a partial upload, so the files left over join the same batch.
  const [batchId, setBatchId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const inputId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const update = (key: string, patch: Partial<Row>) => {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    addFiles(picked);
  }

  /** addFiles takes picked or dropped files; rowProblem flags anything that is not WAV or MP3. */
  function addFiles(picked: File[]) {
    if (busy || picked.length === 0) return;
    setError(null);
    setRows((current) => {
      const room = MAX_BATCH_FILES - current.length;
      if (picked.length > room) setError(`At most ${String(MAX_BATCH_FILES)} files per batch.`);
      return [
        ...current,
        ...picked.slice(0, Math.max(0, room)).map((file) => ({
          key: `${file.name}-${String(file.size)}-${String(Math.random())}`,
          file,
          mime: mimeOf(file),
          agentId: null,
          teamId: null,
          productId: null,
          callDate: today(),
          language: ENGLISH,
          progress: 0,
          error: null,
        })),
      ];
    });
  }

  const problems = rows.map(rowProblem);
  const pages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const current = Math.min(page, pages);
  const shownRows = rows
    .map((row, index) => ({ row, index }))
    .slice((current - 1) * ROWS_PER_PAGE, current * ROWS_PER_PAGE);
  const ready = rows.length > 0 && problems.every((p) => p === null);

  async function upload() {
    setBusy(true);
    setError(null);
    const done = new Set<string>();
    // Held in an object: the callbacks set it while the upload runs.
    const failure: { first: string | null } = { first: null };
    const outcome = await uploadInChunks(
      rows,
      { batchId, batchName: batchName.trim() || undefined },
      { signUploads: api.signUploads, confirmUploads: api.confirmUploads, put: putWithProgress },
      {
        onProgress: (key, progress) => {
          update(key, { progress });
        },
        onDone: (key) => {
          done.add(key);
        },
        onFailed: (key, message) => {
          failure.first ??= message;
          update(key, { error: message, progress: 0 });
        },
      },
    );
    setBusy(false);
    if (outcome.uploaded > 0) await queryClient.invalidateQueries({ queryKey: ["calls"] });
    if (outcome.uploaded > 0) await queryClient.invalidateQueries({ queryKey: ["batches"] });
    if (outcome.failed === 0 && outcome.batchId) {
      toastManager.add({
        type: "success",
        title: `${String(outcome.uploaded)} call${outcome.uploaded > 1 ? "s" : ""} uploaded`,
        description: "Transcription has started.",
      });
      await navigate({ to: "/batches/$batchId", params: { batchId: outcome.batchId } });
      return;
    }
    // Keep only what still needs uploading; the next try joins the same batch.
    setRows((current) => current.filter((r) => !done.has(r.key)));
    setBatchId(outcome.batchId);
    setPage(1);
    setError(
      outcome.uploaded > 0
        ? `${String(outcome.uploaded)} uploaded into the batch; ${String(outcome.failed)} failed. Check them below and upload again.`
        : (failure.first ?? "Upload failed. Nothing was saved; try again."),
    );
  }

  const agents = reference.agents.map((a) => ({
    value: a.id,
    label: a.externalCode ? `${a.name} (${a.externalCode})` : a.name,
  }));
  const teams = reference.teams.map((t) => ({ value: t.id, label: t.name }));
  const products = reference.products.map((p) => ({ value: p.id, label: p.name }));
  const languages = LANGUAGES.map((l) => ({ value: l.code, label: l.label }));
  const setLanguage = (key: string | null, value: string) => {
    const language = languageSchema.safeParse(value);
    if (!language.success) return;
    setRows((current) =>
      current.map((r) => (key === null || r.key === key ? { ...r, language: language.data } : r)),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Upload calls"
        description="Stereo WAV or MP3, agent on the left channel and customer on the right. Up to 500 files of 50 MB each, uploaded as one batch."
        actions={actions}
      />
      {/* The whole frame takes dropped files, empty or not. */}
      <Frame
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(dragging && "ring-2 ring-brand ring-offset-2 ring-offset-background")}
      >
        {dragging && rows.length > 0 ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-background/80 text-sm font-medium"
          >
            Drop to add
          </div>
        ) : null}
        <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Group aria-label="Files">
            <label
              htmlFor={inputId}
              data-slot="button"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "cursor-pointer focus-within:ring-2 focus-within:ring-ring",
              )}
            >
              <FilePlusIcon aria-hidden="true" />
              Choose recordings
              <input
                id={inputId}
                type="file"
                accept=".wav,.mp3,audio/wav,audio/mpeg"
                multiple
                className="sr-only"
                onChange={onFiles}
                disabled={busy || rows.length >= MAX_BATCH_FILES}
              />
            </label>
            <GroupText className="h-8 sm:h-7">
              {rows.length} of {MAX_BATCH_FILES} files
            </GroupText>
          </Group>
          <Button size="sm" disabled={!ready} loading={busy} onClick={() => void upload()}>
            <UploadIcon aria-hidden="true" />
            Upload{" "}
            {rows.length > 0 ? `${String(rows.length)} file${rows.length > 1 ? "s" : ""}` : ""}
          </Button>
        </FrameHeader>
        {rows.length > 0 ? (
          <FramePanel className="flex flex-wrap items-end gap-3 px-4 py-3">
            <label className="flex w-full flex-col gap-1 text-xs font-medium text-muted-foreground sm:w-64">
              {batchId ? "Adding to the batch already started" : "Batch name"}
              <Input
                size="sm"
                placeholder="e.g. Mumbai inbound, week 42"
                value={batchName}
                maxLength={120}
                disabled={busy || batchId !== null}
                onChange={(e) => {
                  setBatchName(e.target.value);
                }}
              />
            </label>
            {rows.length > 1 ? (
              <Group aria-label="Set for every file" className="flex-wrap">
                <GroupText className="h-8 sm:h-7">For every file</GroupText>
                <OptionSelect
                  size="sm"
                  label="Agent for every file"
                  placeholder="Agent"
                  value={null}
                  options={agents}
                  className="w-44"
                  onChange={(agentId) => {
                    const teamId = reference.agents.find((a) => a.id === agentId)?.teamId;
                    setRows((current) =>
                      current.map((r) => ({ ...r, agentId, teamId: teamId ?? r.teamId })),
                    );
                  }}
                />
                <OptionSelect
                  size="sm"
                  label="Product for every file"
                  placeholder="Product"
                  value={null}
                  options={products}
                  className="w-40"
                  onChange={(productId) => {
                    setRows((current) => current.map((r) => ({ ...r, productId })));
                  }}
                />
                <OptionSelect
                  size="sm"
                  label="Language for every file"
                  placeholder="Language"
                  value={null}
                  options={languages}
                  className="w-40"
                  onChange={(value) => {
                    setLanguage(null, value);
                  }}
                />
                <Input
                  type="date"
                  size="sm"
                  aria-label="Call date for every file"
                  max={today()}
                  className="w-40"
                  onChange={(e) => {
                    const callDate = e.target.value;
                    if (callDate) setRows((current) => current.map((r) => ({ ...r, callDate })));
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
        {rows.length === 0 ? (
          <FramePanel className="p-0">
            <div
              className={cn(
                "m-3 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
                dragging ? "border-brand bg-brand/5" : "border-border",
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">
                <UploadCloudIcon aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium">Drop recordings here</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  WAV or MP3, stereo, up to {MAX_BATCH_FILES} files of 50 MB each. Then set the
                  agent, team, product, date and language, for each file or for all at once.
                </p>
              </div>
              <label
                htmlFor={inputId}
                data-slot="button"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "cursor-pointer focus-within:ring-2 focus-within:ring-ring",
                )}
              >
                <FilePlusIcon aria-hidden="true" />
                Choose files
              </label>
            </div>
          </FramePanel>
        ) : null}
        {rows.length > 0 ? (
          <FramePanel className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
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
                {shownRows.map(({ row: r, index: i }) => (
                  <TableRow key={r.key}>
                    <TableCell className="max-w-56">
                      <span className="block truncate font-medium">{r.file.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {(r.file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      {busy ? (
                        <Progress
                          value={r.progress}
                          aria-label={`Upload progress for ${r.file.name}`}
                          className="mt-1"
                        />
                      ) : null}
                      {problems[i] || r.error ? (
                        <span className="mt-1 block text-xs text-destructive-foreground">
                          {problems[i] ?? r.error}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <OptionSelect
                        size="sm"
                        label={`Agent for ${r.file.name}`}
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
                        label={`Team for ${r.file.name}`}
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
                        label={`Product for ${r.file.name}`}
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
                        aria-label={`Call date for ${r.file.name}`}
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
                        label={`Language of ${r.file.name}`}
                        value={r.language}
                        options={languages}
                        onChange={(value) => {
                          setLanguage(r.key, value);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${r.file.name}`}
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
            {rows.length > ROWS_PER_PAGE ? (
              <div className="border-t px-4 py-3">
                <PageNav
                  page={current}
                  pageSize={ROWS_PER_PAGE}
                  total={rows.length}
                  label="files"
                  onPage={setPage}
                />
              </div>
            ) : null}
          </FramePanel>
        ) : null}
      </Frame>
    </div>
  );
}
