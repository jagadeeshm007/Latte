import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Recorded provider responses, keyed by a hash of the request without its
// credentials. Tests and CI replay them, so no live call leaves the build
// (REQ-027). Binary bodies (TTS audio) are stored as base64.

export interface RecordedResponse {
  status: number;
  headers: Record<string, string>;
  json?: unknown;
  base64?: string;
}

export interface Cassette {
  key: string;
  summary: string;
  response: RecordedResponse;
}

export function requestKey(parts: unknown): string {
  return createHash("sha256").update(stableStringify(parts)).digest("hex").slice(0, 32);
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function loadCassette(dir: string, key: string): Promise<Cassette | null> {
  try {
    return JSON.parse(await readFile(path.join(dir, `${key}.json`), "utf8")) as Cassette;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveCassette(dir: string, cassette: Cassette): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${cassette.key}.json`), `${JSON.stringify(cassette, null, 2)}\n`);
}
