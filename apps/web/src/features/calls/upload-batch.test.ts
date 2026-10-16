import { ENGLISH, type UploadConfirmRequest, type UploadSignRequest } from "@scc/shared";
import { describe, expect, it, vi } from "vitest";

import { uploadInChunks, type UploadApi } from "./upload-batch";
import type { Row } from "./upload-rules";

const rows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    key: `k${String(i)}`,
    file: new File([new Uint8Array(4)], `f${String(i)}.wav`),
    mime: "audio/wav",
    agentId: "a1",
    teamId: "t1",
    productId: "p1",
    callDate: "2026-10-01",
    language: ENGLISH,
    progress: 0,
    error: null,
  }));

/** A fake API that signs every file, and fails the confirms named in failOn (1 = first). */
function fakeApi(failOn: number[] = []) {
  const confirms: UploadConfirmRequest[] = [];
  const api: UploadApi = {
    signUploads: vi.fn((body: UploadSignRequest) =>
      Promise.resolve({
        uploads: body.files.map((f) => ({
          path: `u/${f.name}`,
          signedUrl: `s/${f.name}`,
          token: "t",
        })),
      }),
    ),
    confirmUploads: vi.fn((body: UploadConfirmRequest) => {
      confirms.push(body);
      if (failOn.includes(confirms.length)) return Promise.reject(new Error("confirm refused"));
      return Promise.resolve({ batchId: "b1", callIds: body.files.map((_, i) => String(i)) });
    }),
    put: vi.fn((_url: string, _file: File, _type: string, onProgress: (p: number) => void) => {
      onProgress(100);
      return Promise.resolve();
    }),
  };
  return { api, confirms };
}

const callbacks = () => ({ onProgress: vi.fn(), onDone: vi.fn(), onFailed: vi.fn() });

describe("uploading a batch in chunks", () => {
  it("names the batch on the first chunk of ten, and joins it on every chunk after", async () => {
    const { api, confirms } = fakeApi();

    const outcome = await uploadInChunks(
      rows(25),
      { batchId: null, batchName: "Week 42" },
      api,
      callbacks(),
    );

    expect(outcome).toEqual({ batchId: "b1", uploaded: 25, failed: 0 });
    expect(confirms.map((c) => [c.files.length, c.batchName, c.batchId])).toEqual([
      [10, "Week 42", undefined],
      [10, undefined, "b1"],
      [5, undefined, "b1"],
    ]);
  });

  it("keeps going past a failed chunk and names its files", async () => {
    const { api } = fakeApi([2]);
    const on = callbacks();

    const outcome = await uploadInChunks(rows(25), { batchId: null }, api, on);

    expect(outcome).toEqual({ batchId: "b1", uploaded: 15, failed: 10 });
    expect(on.onFailed).toHaveBeenCalledTimes(10);
    expect(on.onFailed).toHaveBeenCalledWith(expect.any(String), "confirm refused");
  });

  it("tries nothing more when the first chunk cannot create the batch", async () => {
    const { api, confirms } = fakeApi([1]);

    const outcome = await uploadInChunks(rows(25), { batchId: null }, api, callbacks());

    expect(outcome).toEqual({ batchId: null, uploaded: 0, failed: 10 });
    expect(confirms).toHaveLength(1);
  });

  it("adds every chunk to a batch already started", async () => {
    const { api, confirms } = fakeApi();

    await uploadInChunks(rows(3), { batchId: "b7" }, api, callbacks());

    expect(confirms.map((c) => c.batchId)).toEqual(["b7"]);
  });
});
