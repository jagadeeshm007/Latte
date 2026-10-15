import type { Segment } from "@scc/shared";

function vttTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = ((ms % 60_000) / 1000).toFixed(3).padStart(6, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${sec}`;
}

/** captionsUrl turns the transcript into WebVTT captions for the player, speaker first. */
export function captionsUrl(segments: Segment[]): string {
  const cues = segments.map(
    (s) =>
      `${vttTime(s.startMs)} --> ${vttTime(Math.max(s.endMs, s.startMs + 500))}\n${s.channel === "agent" ? "Agent" : "Customer"}: ${s.text.replace(/-->/g, "->")}`,
  );
  return `data:text/vtt;charset=utf-8,${encodeURIComponent(`WEBVTT\n\n${cues.join("\n\n")}\n`)}`;
}
