import type { Segment } from "@scc/shared";

import {
  type AudioPeaks,
  computePeaks,
  decodeAudioChannels,
  normalizePeaks,
} from "@/lib/waveform-dsp";

// Pure pieces of the waveform player, kept out of the component so they can
// be tested without a DOM or an audio decoder.

/** Slices in the drawn envelope shown before the recording is decoded. */
export const BAR_COUNT = 240;

export type Channel = Segment["channel"];

export interface Bar {
  /** Height from 0 to 1. */
  amp: number;
  /** Who is speaking at this bar's midpoint; null in a silence. */
  channel: Channel | null;
  seq: number | null;
}

/** Length of the call: the audio's own duration when known, else the last segment's end. */
export function callDurationMs(segments: Segment[], audioMs?: number): number {
  if (audioMs && Number.isFinite(audioMs) && audioMs > 0) return audioMs;
  return segments.reduce((max, s) => Math.max(max, s.endMs), 0);
}

/** segmentAt returns the segment spoken at ms, or undefined in a silence. */
export function segmentAt(segments: Segment[], ms: number): Segment | undefined {
  return segments.find((s) => ms >= s.startMs && ms < s.endMs);
}

// A stable 0..1 value per (seq, bar) so the drawn shape does not change between renders.
function noise(seq: number, i: number): number {
  const x = Math.sin(seq * 127.1 + i * 311.7) * 43_758.5453;
  return x - Math.floor(x);
}

/**
 * buildBars splits the call into count slices, each with the speaker at its
 * midpoint. Heights come from peaks when given; otherwise a speech-like
 * envelope over each segment stands in until the recording is decoded, and
 * silences sit flat.
 */
export function buildBars(
  segments: Segment[],
  durationMs: number,
  count: number,
  peaks?: number[],
): Bar[] {
  if (count <= 0 || durationMs <= 0) return [];
  const step = durationMs / count;
  return Array.from({ length: count }, (_, i) => {
    const mid = (i + 0.5) * step;
    const seg = segmentAt(segments, mid);
    const peak = peaks?.[i];
    if (!seg)
      return { amp: peak !== undefined ? Math.max(0.04, peak) : 0.04, channel: null, seq: null };
    let amp: number;
    if (peak !== undefined) {
      amp = Math.max(0.08, peak);
    } else {
      // Rises at the start of the phrase, falls at the end, jitters between.
      const t = (mid - seg.startMs) / Math.max(1, seg.endMs - seg.startMs);
      const envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.6;
      amp = 0.18 + 0.72 * envelope * (0.45 + 0.55 * noise(seg.seq, i));
    }
    return { amp: Math.min(1, amp), channel: seg.channel, seq: seg.seq };
  });
}

/** Slices measured per decoded recording: above any width the strip is drawn at, and the waveform fits them. */
export const PEAK_RESOLUTION = 2048;

/** decodePeaks fetches the recording and measures it with audio/ui's DSP helpers; null when either step fails. */
export async function decodePeaks(url: string): Promise<AudioPeaks | null> {
  if (typeof window.AudioContext !== "function") return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ctx = new AudioContext();
    try {
      const channels = await decodeAudioChannels(ctx, await res.arrayBuffer());
      return normalizePeaks(computePeaks(channels, PEAK_RESOLUTION));
    } finally {
      void ctx.close();
    }
  } catch {
    // The drawn envelope stays; the player itself is unaffected.
    return null;
  }
}
