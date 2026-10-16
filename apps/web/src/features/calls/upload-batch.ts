import type {
  UploadConfirmRequest,
  UploadConfirmResponse,
  UploadSignRequest,
  UploadSignResponse,
} from "@scc/shared";

import type { Row } from "./upload-rules";

// A batch of up to 500 recordings goes up in chunks: each chunk is signed,
// its files uploaded straight to storage, then confirmed into the batch. The
// first chunk creates the batch, then a few chunks run at once. A chunk that
// fails does not stop the others; its files stay on the page to try again.

/** Files per sign and confirm request. */
export const CHUNK_SIZE = 10;
/** Chunks in flight at once, after the first. */
export const PARALLEL_CHUNKS = 3;

export interface UploadApi {
  signUploads: (body: UploadSignRequest) => Promise<UploadSignResponse>;
  confirmUploads: (body: UploadConfirmRequest) => Promise<UploadConfirmResponse>;
  put: (
    url: string,
    file: File,
    contentType: string,
    onProgress: (p: number) => void,
  ) => Promise<void>;
}

export interface UploadCallbacks {
  onProgress: (key: string, progress: number) => void;
  onDone: (key: string) => void;
  onFailed: (key: string, message: string) => void;
}

export interface UploadOutcome {
  batchId: string | null;
  uploaded: number;
  failed: number;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let at = 0; at < items.length; at += size) out.push(items.slice(at, at + size));
  return out;
}

/** uploadInChunks uploads rows into one batch (an existing one when batchId is given). */
export async function uploadInChunks(
  rows: Row[],
  opts: { batchId: string | null; batchName?: string | undefined },
  api: UploadApi,
  on: UploadCallbacks,
): Promise<UploadOutcome> {
  const parts = chunks(rows, CHUNK_SIZE);
  let batchId = opts.batchId;
  let uploaded = 0;
  let failed = 0;

  const run = async (part: Row[]) => {
    try {
      const signed = await api.signUploads({
        files: part.map((r) => ({
          name: r.file.name,
          type: r.mime ?? "audio/wav",
          size: r.file.size,
        })),
      });
      await Promise.all(
        part.map(async (r, i) => {
          const target = signed.uploads[i];
          if (!target) throw new Error("The server did not sign every file");
          await api.put(target.signedUrl, r.file, r.mime ?? "audio/wav", (p) => {
            on.onProgress(r.key, p);
          });
        }),
      );
      const result = await api.confirmUploads({
        ...(batchId ? { batchId } : opts.batchName ? { batchName: opts.batchName } : {}),
        files: part.map((r, i) => ({
          path: signed.uploads[i]?.path ?? "",
          originalFilename: r.file.name,
          mimeType: r.mime ?? "audio/wav",
          sizeBytes: r.file.size,
          agentId: r.agentId ?? "",
          teamId: r.teamId ?? "",
          productId: r.productId ?? "",
          callDate: r.callDate,
          language: r.language,
        })),
      });
      batchId = result.batchId;
      uploaded += part.length;
      for (const r of part) on.onDone(r.key);
    } catch (e) {
      failed += part.length;
      const message = e instanceof Error ? e.message : "Upload failed";
      for (const r of part) on.onFailed(r.key, message);
    }
  };

  // The first chunk makes the batch the rest join; without it, nothing else is tried.
  const first = batchId ? undefined : parts.shift();
  if (first) {
    await run(first);
    if (!batchId) return { batchId, uploaded, failed };
  }
  let next = 0;
  const worker = async () => {
    for (let part = parts[next++]; part; part = parts[next++]) await run(part);
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL_CHUNKS, parts.length) }, worker));
  return { batchId, uploaded, failed };
}
