import { createRequire } from "node:module";

import { MPEGDecoder } from "mpg123-decoder";
import type * as Wavefile from "wavefile";

// wavefile ships CommonJS that Node ESM cannot read named exports from; load it with require.
const { WaveFile } = createRequire(import.meta.url)("wavefile") as typeof Wavefile;

// Decodes an uploaded recording into float samples per channel. Stereo is
// required: the agent is on the left channel and the customer on the right
// (REQ-005), so a mono file cannot be split and is refused.

export interface DecodedAudio {
  sampleRate: number;
  channels: Float32Array[];
  durationMs: number;
}

export class AudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** MonoRecordingError carries the message users see (AC-US-01-001-4). */
export class MonoRecordingError extends AudioError {
  constructor() {
    super("Recording must be stereo: agent left, customer right");
  }
}

export const MAX_DURATION_MS = 2 * 60 * 60 * 1000;
const MP3_PIECE_BYTES = 256 * 1024;

export async function decodeAudio(bytes: Uint8Array, mimeType: string): Promise<DecodedAudio> {
  const decoded = mimeType === "audio/mpeg" ? await decodeMp3(bytes) : decodeWav(bytes);
  if (decoded.channels.length < 2) {
    throw new MonoRecordingError();
  }
  const length = decoded.channels[0]?.length ?? 0;
  const durationMs = Math.round((length / decoded.sampleRate) * 1000);
  if (length === 0) {
    throw new AudioError("Recording has no audio");
  }
  if (durationMs > MAX_DURATION_MS) {
    throw new AudioError("Recording is longer than 2 hours");
  }
  return { sampleRate: decoded.sampleRate, channels: decoded.channels.slice(0, 2), durationMs };
}

function decodeWav(bytes: Uint8Array): Omit<DecodedAudio, "durationMs"> {
  let wav: Wavefile.WaveFile;
  try {
    wav = new WaveFile(bytes);
  } catch {
    throw new AudioError("File is not a readable WAV recording");
  }
  // toBitDepth resets wav.fmt in place, so copy the values first.
  const { numChannels, sampleRate, audioFormat, byteRate } = wav.fmt as {
    numChannels: number;
    sampleRate: number;
    audioFormat: number;
    byteRate: number;
  };
  // Check the header before decoding, so a crafted file cannot make the worker
  // allocate gigabytes first and fail later (security review).
  if (!(sampleRate > 0) || !(byteRate > 0) || !(numChannels > 0)) {
    throw new AudioError("File is not a readable WAV recording");
  }
  const dataBytes = (wav.data as { chunkSize: number }).chunkSize;
  if ((dataBytes / byteRate) * 1000 > MAX_DURATION_MS) {
    throw new AudioError("Recording is longer than 2 hours");
  }
  if (audioFormat === 6) {
    wav.fromALaw();
  } else if (audioFormat === 7) {
    wav.fromMuLaw();
  } else if (audioFormat === 17) {
    wav.fromIMAADPCM();
  }
  wav.toBitDepth("32f");
  const samples = wav.getSamples(false, Float32Array) as unknown;
  const channels = numChannels > 1 ? (samples as Float32Array[]) : [samples as Float32Array];
  return { sampleRate, channels };
}

async function decodeMp3(bytes: Uint8Array): Promise<Omit<DecodedAudio, "durationMs">> {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  try {
    // Decode in pieces and stop at the duration cap, so a long low-bitrate file
    // is refused before it fills memory (security review).
    const parts: Float32Array[][] = [];
    let sampleRate = 0;
    let total = 0;
    for (let offset = 0; offset < bytes.length; offset += MP3_PIECE_BYTES) {
      const result = decoder.decode(bytes.subarray(offset, offset + MP3_PIECE_BYTES));
      if (result.samplesDecoded === 0) continue;
      sampleRate = result.sampleRate;
      total += result.samplesDecoded;
      if ((total / sampleRate) * 1000 > MAX_DURATION_MS) {
        throw new AudioError("Recording is longer than 2 hours");
      }
      parts.push(result.channelData);
    }
    if (total === 0 || sampleRate <= 0) {
      throw new AudioError("File is not a readable MP3 recording");
    }
    const channelCount = Math.max(...parts.map((p) => p.length));
    const channels = Array.from({ length: channelCount }, (_, c) => {
      const out = new Float32Array(total);
      let at = 0;
      for (const p of parts) {
        const piece = p[c] ?? p[0] ?? new Float32Array(0);
        out.set(piece, at);
        at += piece.length;
      }
      return out;
    });
    return { sampleRate, channels };
  } finally {
    decoder.free();
  }
}
