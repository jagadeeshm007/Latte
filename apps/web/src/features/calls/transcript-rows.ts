import { parseTranscript } from "@latte/sdk/transcript";
import { type Language, type TranscriptLine } from "@scc/shared";

// Rows of the transcript upload form (ADR-0030): each file or pasted text is
// read in the browser into the lines the API takes, so a problem shows on its
// row before anything is sent.

export interface TranscriptRow {
  key: string;
  name: string;
  lines: TranscriptLine[];
  /** Why the text could not be read; such a row cannot be uploaded. */
  parseError: string | null;
  agentId: string | null;
  teamId: string | null;
  productId: string | null;
  callDate: string;
  language: Exclude<Language, "auto">;
  /** The server's reason, after a failed upload. */
  error: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);
/** English unless the uploader says otherwise; a transcript cannot be auto-detected. */
const DEFAULT_LANGUAGE: TranscriptRow["language"] = "en-IN";

/** rowFromText reads one transcript into a row, keeping the reason when it cannot. */
export function rowFromText(name: string, text: string, key: string): TranscriptRow {
  let lines: TranscriptLine[] = [];
  let parseError: string | null = null;
  try {
    lines = parseTranscript(text);
  } catch (error) {
    parseError = error instanceof Error ? error.message : "could not read this transcript";
  }
  return {
    key,
    name,
    lines,
    parseError,
    agentId: null,
    teamId: null,
    productId: null,
    callDate: today(),
    language: DEFAULT_LANGUAGE,
    error: null,
  };
}

/** readText reads a picked file as text; FileReader works in every browser the app supports. */
export function readText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("could not read the file"));
    };
    reader.readAsText(file);
  });
}

/** rowProblem says what still stops a row from uploading, or null. */
export function rowProblem(row: TranscriptRow): string | null {
  if (row.parseError) return row.parseError;
  if (!row.agentId) return "Choose the agent";
  if (!row.teamId) return "Choose the team";
  if (!row.productId) return "Choose the product";
  if (!row.callDate) return "Choose the call date";
  return null;
}

/** Whether every line carries a time; untimed transcripts show line numbers once scored. */
export const isTimed = (row: TranscriptRow) =>
  row.lines.length > 0 && row.lines.every((l) => l.startMs !== undefined);
