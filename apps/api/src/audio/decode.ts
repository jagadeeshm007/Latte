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
  const { numChannels, sampleRate, audioFormat } = wav.fmt as {
    numChannels: number;
    sampleRate: number;
    audioFormat: number;
  };
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
    const result = decoder.decode(bytes);
    if (result.samplesDecoded === 0) {
      throw new AudioError("File is not a readable MP3 recording");
    }
    return { sampleRate: result.sampleRate, channels: result.channelData };
  } finally {
    decoder.free();
  }
}
