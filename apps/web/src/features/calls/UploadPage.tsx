import { MAX_UPLOAD_FILES, type Reference } from "@scc/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FilePlusIcon, UploadIcon, XIcon } from "lucide-react";
import { useId, useState, type ChangeEvent } from "react";

import { OptionSelect } from "@/components/OptionSelect";
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
import { api, referenceQuery } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

import { mimeOf, type Row, rowProblem } from "./upload-rules";

// S3: pick 1 to 10 stereo recordings, give each its agent, team, product and
// date, upload straight to private storage, then confirm (US-01-001).

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

export function UploadPage() {
  const reference = useQuery(referenceQuery);
  if (reference.isPending) return <Loading />;
  if (reference.isError) return <ErrorState error={reference.error} />;
  return <UploadForm reference={reference.data} />;
}

export function UploadForm({ reference }: { reference: Reference }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const update = (key: string, patch: Partial<Row>) => {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError(null);
    setRows((current) => {
      const room = MAX_UPLOAD_FILES - current.length;
      if (picked.length > room) setError(`At most ${String(MAX_UPLOAD_FILES)} files per upload.`);
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
          progress: 0,
          error: null,
        })),
      ];
    });
  }

  const problems = rows.map(rowProblem);
  const ready = rows.length > 0 && problems.every((p) => p === null);

  async function upload() {
    setBusy(true);
    setError(null);
    try {
      const signed = await api.signUploads({
        files: rows.map((r) => ({
          name: r.file.name,
          type: r.mime ?? "audio/wav",
          size: r.file.size,
        })),
      });
      await Promise.all(
        rows.map(async (r, i) => {
          const target = signed.uploads[i];
          if (!target) throw new Error("The server did not sign every file");
          await putWithProgress(target.signedUrl, r.file, r.mime ?? "audio/wav", (progress) => {
            update(r.key, { progress });
          });
        }),
      );
      const result = await api.confirmUploads({
        files: rows.map((r, i) => ({
          path: signed.uploads[i]?.path ?? "",
          originalFilename: r.file.name,
          mimeType: r.mime ?? "audio/wav",
          sizeBytes: r.file.size,
          agentId: r.agentId ?? "",
          teamId: r.teamId ?? "",
          productId: r.productId ?? "",
          callDate: r.callDate,
        })),
      });
      await queryClient.invalidateQueries({ queryKey: ["calls"] });
      toastManager.add({
        type: "success",
        title: `${String(result.callIds.length)} call${result.callIds.length > 1 ? "s" : ""} uploaded`,
        description: "Transcription has started.",
      });
      await navigate({ to: "/calls" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const agents = reference.agents.map((a) => ({
    value: a.id,
    label: a.externalCode ? `${a.name} (${a.externalCode})` : a.name,
  }));
  const teams = reference.teams.map((t) => ({ value: t.id, label: t.name }));
  const products = reference.products.map((p) => ({ value: p.id, label: p.name }));

  return (
    <>
      <PageHeader
        title="Upload calls"
        description="Stereo WAV or MP3, agent on the left channel and customer on the right. Up to 10 files of 50 MB each."
      />
      <Frame>
        <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-3 py-2">
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
                disabled={busy || rows.length >= MAX_UPLOAD_FILES}
              />
            </label>
            <GroupText className="h-8 sm:h-7">
              {rows.length} of {MAX_UPLOAD_FILES} files
            </GroupText>
          </Group>
          <Button size="sm" disabled={!ready} loading={busy} onClick={() => void upload()}>
            <UploadIcon aria-hidden="true" />
            Upload{" "}
            {rows.length > 0 ? `${String(rows.length)} file${rows.length > 1 ? "s" : ""}` : ""}
          </Button>
        </FrameHeader>
        {error ? (
          <Alert variant="error" className="mb-1" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
                  <TableHead>
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
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
                      {problems[i] ? (
                        <span className="mt-1 block text-xs text-destructive">{problems[i]}</span>
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
          </FramePanel>
        ) : (
          <FramePanel className="px-4 py-6 text-center text-sm text-muted-foreground">
            Choose up to {MAX_UPLOAD_FILES} recordings, then set the agent, team, product and date
            for each.
          </FramePanel>
        )}
      </Frame>
    </>
  );
}
