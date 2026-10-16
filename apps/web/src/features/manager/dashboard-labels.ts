import { type DashboardGroup, LANGUAGES } from "@scc/shared";

/** groupName names a dashboard group for people: language groups arrive as codes (hi-IN). */
export function groupName(groupBy: DashboardGroup, name: string): string {
  return groupBy === "language" ? (LANGUAGES.find((l) => l.code === name)?.label ?? name) : name;
}

/** Spend purposes in a fixed order, so each keeps its chart colour whatever the month holds. */
export const PURPOSES = ["transcribe", "translate", "score", "seed_stt", "seed_tts"] as const;

export const PURPOSE_LABEL: Record<string, string> = {
  transcribe: "Transcription",
  translate: "Translation",
  score: "Judge",
  seed_stt: "Seed transcription",
  seed_tts: "Seed voices",
};

/** The four validated series colours; any fifth purpose folds into "Other". */
export const SERIES = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)"] as const;

/** How a pass rate reads: the colour always comes with the number beside it. */
export function rateTone(rate: number): string {
  return rate < 0.6 ? "bg-destructive" : rate < 0.8 ? "bg-warning" : "bg-success";
}

/** Chart chrome shared by every Recharts chart: tooltips and axis ticks in theme colours. */
export const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
};
export const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
