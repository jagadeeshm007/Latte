import { type AUDIO_MIME_TYPES, type Language, MAX_UPLOAD_BYTES } from "@scc/shared";

// Checks on each file before it is uploaded; the API checks them again (AC-US-01-001-3).

export type Mime = (typeof AUDIO_MIME_TYPES)[number];

export interface Row {
  key: string;
  file: File;
  mime: Mime | null;
  agentId: string | null;
  teamId: string | null;
  productId: string | null;
  callDate: string;
  /** Picks the speech-to-text engine: English to Whisper, Indian languages to Sarvam (ADR-0014). */
  language: Language;
  progress: number;
  error: string | null;
}

/** mimeOf trusts the extension: browsers report WAV as audio/wav, audio/x-wav or audio/wave. */
export function mimeOf(file: File): Mime | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  return null;
}

/** rowProblem names what stops a row being uploaded, or null when it is ready. */
export function rowProblem(row: Row): string | null {
  if (!row.mime) return "Only WAV or MP3 recordings are accepted";
  if (row.file.size > MAX_UPLOAD_BYTES) return "File is larger than 50 MB";
  if (row.file.size === 0) return "File is empty";
  if (!row.agentId || !row.teamId || !row.productId) return "Choose the agent, team and product";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.callDate)) return "Enter the call date";
  return null;
}
