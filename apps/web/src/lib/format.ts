import type { CallStatus, FindingStatus } from "@scc/shared";

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function formatPercent(value: number | null, digits = 0): string {
  return value === null ? "No data yet" : `${(value * 100).toFixed(digits)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const STATUS_LABEL: Record<CallStatus, string> = {
  uploaded: "Queued",
  transcribing: "Transcribing",
  transcribed: "Transcribed",
  scoring: "Scoring",
  scored: "Scored",
  failed: "Failed",
};

export const FINDING_LABEL: Record<FindingStatus, string> = {
  met: "Met",
  missed: "Missed",
  partial: "Partial",
  breach: "Breach",
  clear: "Clear",
  not_applicable: "Not applicable",
};

export type Tone = "success" | "warning" | "error" | "info" | "secondary";

export function findingTone(status: FindingStatus): Tone {
  switch (status) {
    case "met":
    case "clear":
      return "success";
    case "partial":
    case "missed":
      return "warning";
    case "breach":
      return "error";
    case "not_applicable":
      return "secondary";
  }
}

/** Pipeline states that are still moving; screens poll while a call is in one. */
export const IN_PROGRESS: ReadonlySet<string> = new Set([
  "uploaded",
  "transcribing",
  "transcribed",
  "scoring",
]);
