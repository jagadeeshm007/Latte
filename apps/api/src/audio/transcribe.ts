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
}

export interface Transcript {
  durationMs: number;
  segments: TranscriptSegment[];
}

/** Whisper writes text on near-silence; drop segments it is itself unsure contain speech. */
function isLikelyHallucination(s: SttChunkResult["segments"][number]): boolean {
  return (s.noSpeechProb ?? 0) > 0.8 && (s.avgLogprob ?? 0) < -1;
}

export async function transcribeRecording(
  bytes: Uint8Array,
  mimeType: string,
  transcribe: TranscribeChunk,
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
    const chunks = buildChunks(mono, TARGET_RATE, regions);
    for (const [n, chunk] of chunks.entries()) {
      const result = await transcribe(
        encodeWav([chunk.samples], TARGET_RATE),
        chunk.durationMs / 1000,
        `${channel}-${String(n)}`,
      );
      for (const s of result.segments) {
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
        });
      }
    }
  }
  unsorted.sort((a, b) => a.startMs - b.startMs || (a.channel === "agent" ? -1 : 1));
  return { durationMs: audio.durationMs, segments: unsorted.map((s, seq) => ({ ...s, seq })) };
}
