import { decodeAudio } from "./decode.ts";
import { buildChunks, detectSpeech, toCallTime } from "./vad.ts";
import { encodeWav, resample } from "./wav.ts";

// Recording to timestamped segments: decode, split left (agent) and right
// (customer), resample to 16 kHz, keep speech only, transcribe each chunk
// through the gateway, map times back to call time, merge both channels.

export const TARGET_RATE = 16_000;

export type Channel = "agent" | "customer";

export interface SttChunkResult {
  language: string | null;
  segments: {
    start: number;
    end: number;
    text: string;
    avgLogprob: number | null;
    noSpeechProb: number | null;
  }[];
  /** Every word of the chunk in seconds, not grouped by segment. */
  words: { text: string; start: number; end: number }[];
}

/** Transcribes one 16 kHz mono WAV chunk; the job passes a gateway-backed function. */
export type TranscribeChunk = (
  wav: Uint8Array,
  durationSeconds: number,
  label: string,
) => Promise<SttChunkResult>;

export interface TranscriptSegment {
  seq: number;
  channel: Channel;
  startMs: number;
  endMs: number;
  text: string;
  language: string | null;
  avgLogprob: number | null;
  /** The segment's words in call time, for the read-along highlight; empty when STT sent none. */
  words: { text: string; startMs: number; endMs: number }[];
}

export interface Transcript {
  durationMs: number;
  segments: TranscriptSegment[];
}

/** Whisper writes text on near-silence; drop segments it is itself unsure contain speech. */
function isLikelyHallucination(s: SttChunkResult["segments"][number]): boolean {
  return (s.noSpeechProb ?? 0) > 0.8 && (s.avgLogprob ?? 0) < -1;
}

/**
 * wordsBySegment gives each segment of a chunk its words. Whisper lists words
 * for the whole chunk, so a word goes to the segment holding its midpoint, or
 * else to the nearest one. Indexes match result.segments.
 */
export function wordsBySegment(result: SttChunkResult): SttChunkResult["words"][] {
  const groups: SttChunkResult["words"][] = result.segments.map(() => []);
  for (const w of result.words) {
    const mid = (w.start + w.end) / 2;
    let best = -1;
    let bestGap = Number.POSITIVE_INFINITY;
    for (const [i, s] of result.segments.entries()) {
      const gap = mid < s.start ? s.start - mid : mid > s.end ? mid - s.end : 0;
      if (gap < bestGap) {
        best = i;
        bestGap = gap;
      }
    }
    groups[best]?.push(w);
  }
  return groups;
}

export interface TranscribeOptions {
  /** Longest chunk sent in one request; Sarvam's real-time API takes about 30 s (ADR-0014). */
  maxChunkMs?: number;
  /**
   * Send each utterance as its own request. Sarvam times a request as one
   * chunk, so joined utterances would come back as a single line.
   */
  onePerUtterance?: boolean;
}

export async function transcribeRecording(
  bytes: Uint8Array,
  mimeType: string,
  transcribe: TranscribeChunk,
  options: TranscribeOptions = {},
): Promise<Transcript> {
  const audio = await decodeAudio(bytes, mimeType);
  const channels: Channel[] = ["agent", "customer"];
  const unsorted: Omit<TranscriptSegment, "seq">[] = [];
  for (const [index, channel] of channels.entries()) {
    const source = audio.channels[index];
    if (!source) {
      continue;
    }
    const mono = resample(source, audio.sampleRate, TARGET_RATE);
    const regions = detectSpeech(mono, TARGET_RATE);
    const chunks = buildChunks(
      mono,
      TARGET_RATE,
      regions,
      options.maxChunkMs,
      options.onePerUtterance ?? false,
    );
    for (const [n, chunk] of chunks.entries()) {
      const result = await transcribe(
        encodeWav([chunk.samples], TARGET_RATE),
        chunk.durationMs / 1000,
        `${channel}-${String(n)}`,
      );
      const words = wordsBySegment(result);
      for (const [i, s] of result.segments.entries()) {
        if (!s.text.trim() || isLikelyHallucination(s)) {
          continue;
        }
        const startMs = toCallTime(chunk.map, s.start * 1000);
        const endMs = Math.max(startMs, toCallTime(chunk.map, s.end * 1000));
        unsorted.push({
          channel,
          startMs,
          endMs,
          text: s.text.trim(),
          language: result.language,
          avgLogprob: s.avgLogprob,
          words: (words[i] ?? []).map((w) => {
            const wordStart = toCallTime(chunk.map, w.start * 1000);
            return {
              text: w.text,
              startMs: Math.round(wordStart),
              endMs: Math.round(Math.max(wordStart, toCallTime(chunk.map, w.end * 1000))),
            };
          }),
        });
      }
    }
  }
  unsorted.sort((a, b) => a.startMs - b.startMs || (a.channel === "agent" ? -1 : 1));
  return { durationMs: audio.durationMs, segments: unsorted.map((s, seq) => ({ ...s, seq })) };
}
