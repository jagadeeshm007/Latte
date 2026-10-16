import { once } from "node:events";
import type { Writable } from "node:stream";

import { Zip, ZipDeflate, ZipPassThrough } from "fflate";

// Streams a ZIP to a writable (the HTTP response) one entry at a time, so a
// batch of recordings never sits in memory at once: each entry is loaded,
// written in slices, and released before the next. Writing waits whenever
// the client is slower than the zip.

export interface ZipEntry {
  name: string;
  /** null skips the entry (a recording removed after retention, say). */
  load: () => Promise<Uint8Array | null>;
  /** Text compresses well; audio is already compressed, so it is stored as is. */
  compress: boolean;
}

const SLICE = 256 * 1024;

export async function writeZip(out: Writable, entries: ZipEntry[]): Promise<void> {
  // Held in an object: the zip callback sets it, and the loop reads it.
  const state: { failure: Error | null } = { failure: null };
  let finished!: () => void;
  const done = new Promise<void>((resolve) => {
    finished = resolve;
  });
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      state.failure = error;
      finished();
      return;
    }
    out.write(chunk);
    if (final) finished();
  });
  const drained = async () => {
    if (out.writableNeedDrain) await once(out, "drain");
  };

  for (const entry of entries) {
    const data = await entry.load();
    if (!data) continue;
    const file = entry.compress
      ? new ZipDeflate(entry.name, { level: 6 })
      : new ZipPassThrough(entry.name);
    zip.add(file);
    if (data.length === 0) file.push(new Uint8Array(0), true);
    for (let at = 0; at < data.length; at += SLICE) {
      file.push(data.subarray(at, at + SLICE), at + SLICE >= data.length);
      await drained();
    }
    if (state.failure) break;
  }
  zip.end();
  await done;
  if (state.failure) throw state.failure;
}

/** safeName makes a stored file name safe as a path inside a ZIP and as a download name. */
export function safeName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\p{Cc}/gu, "")
    .replace(/^\.+/, "")
    .trim();
  return (cleaned || "file").slice(0, 120);
}
