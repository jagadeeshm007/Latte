import { describe, expect, it, vi } from "vitest";

import { AudioError, decodeAudio, MonoRecordingError } from "./decode.ts";
import { transcribeRecording } from "./transcribe.ts";
import { buildChunks, detectSpeech, GAP_MS, toCallTime } from "./vad.ts";
import { encodeWav, resample } from "./wav.ts";

const RATE = 16_000;

/** A channel of `seconds` length with a 440 Hz tone in each [start, end) second span. */
function channel(seconds: number, spans: [number, number][]): Float32Array {
  const out = new Float32Array(seconds * RATE);
  for (const [start, end] of spans) {
    for (let i = start * RATE; i < end * RATE; i++) {
      out[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / RATE);
    }
  }
  return out;
}

describe("decodeAudio", () => {
  it("decodes a stereo WAV into two channels with its duration", async () => {
    const wav = encodeWav([channel(2, [[0, 1]]), channel(2, [[1, 2]])], RATE);

    const audio = await decodeAudio(wav, "audio/wav");

    expect(audio.channels).toHaveLength(2);
    expect(audio.sampleRate).toBe(RATE);
    expect(audio.durationMs).toBe(2000);
  });

  it("refuses a mono recording with the message users see", async () => {
    const wav = encodeWav([channel(1, [[0, 1]])], RATE);

    await expect(decodeAudio(wav, "audio/wav")).rejects.toThrow(MonoRecordingError);
    await expect(decodeAudio(wav, "audio/wav")).rejects.toThrow(
      "Recording must be stereo: agent left, customer right",
    );
  });

  it("refuses bytes that are not a WAV file", async () => {
    await expect(decodeAudio(new Uint8Array([1, 2, 3, 4]), "audio/wav")).rejects.toThrow(
      AudioError,
    );
  });

  it("refuses bytes that are not an MP3 file", async () => {
    await expect(decodeAudio(new Uint8Array(4096), "audio/mpeg")).rejects.toThrow(AudioError);
  });
});

describe("resample", () => {
  it("changes the length by the rate ratio", () => {
    expect(resample(new Float32Array(44_100), 44_100, 16_000)).toHaveLength(16_000);
    expect(resample(new Float32Array(8000), 8000, 16_000)).toHaveLength(16_000);
  });

  it("keeps a constant signal constant", () => {
    const out = resample(new Float32Array(4410).fill(0.25), 44_100, 16_000);

    expect(out[100]).toBeCloseTo(0.25, 5);
  });
});

describe("detectSpeech", () => {
  it("finds the voiced spans of a channel and ignores silence", () => {
    const regions = detectSpeech(
      channel(10, [
        [1, 3],
        [6, 7],
      ]),
      RATE,
    );

    expect(regions).toHaveLength(2);
    expect(regions[0]!.startMs).toBeGreaterThanOrEqual(700);
    expect(regions[0]!.startMs).toBeLessThanOrEqual(1000);
    expect(regions[1]!.endMs).toBeGreaterThanOrEqual(7000);
    expect(regions[1]!.endMs).toBeLessThanOrEqual(7600);
  });

  it("returns nothing for a silent channel", () => {
    expect(detectSpeech(new Float32Array(RATE * 3), RATE)).toEqual([]);
  });
});

describe("buildChunks and toCallTime", () => {
  it("maps a time in the trimmed audio back to call time within 500 ms", () => {
    const samples = channel(20, [
      [2, 4],
      [15, 17],
    ]);
    const regions = detectSpeech(samples, RATE);
    const [chunk] = buildChunks(samples, RATE, regions);

    // The second region starts after the first region and one gap in the chunk.
    const firstDuration = regions[0]!.endMs - regions[0]!.startMs;
    const secondInChunk = firstDuration + GAP_MS + 500;
    const callTime = toCallTime(chunk!.map, secondInChunk);

    expect(Math.abs(callTime - (regions[1]!.startMs + 500))).toBeLessThan(500);
    expect(chunk!.durationMs).toBeLessThan(10_000);
  });

  it("splits into several chunks when speech passes the chunk length", () => {
    const samples = channel(30, [
      [0, 9],
      [10, 19],
      [20, 29],
    ]);
    const chunks = buildChunks(samples, RATE, detectSpeech(samples, RATE), 12_000);

    expect(chunks.length).toBe(3);
  });
});

describe("transcribeRecording", () => {
  it("transcribes each channel, labels speakers and orders segments by call time", async () => {
    const wav = encodeWav([channel(12, [[1, 3]]), channel(12, [[6, 8]])], RATE);
    const transcribe = vi
      .fn()
      .mockResolvedValueOnce({
        language: "english",
        segments: [
          { start: 0.2, end: 1.8, text: " Hello sir ", avgLogprob: -0.2, noSpeechProb: 0.01 },
        ],
      })
      .mockResolvedValueOnce({
        language: "hindi",
        segments: [
          { start: 0.2, end: 1.5, text: "haan boliye", avgLogprob: -0.3, noSpeechProb: 0.02 },
        ],
      });

    const transcript = await transcribeRecording(wav, "audio/wav", transcribe);

    expect(transcribe).toHaveBeenCalledTimes(2);
    expect(transcript.segments.map((s) => [s.seq, s.channel, s.text])).toEqual([
      [0, "agent", "Hello sir"],
      [1, "customer", "haan boliye"],
    ]);
    expect(transcript.segments[1]!.startMs).toBeGreaterThan(5500);
    expect(transcript.segments[1]!.language).toBe("hindi");
  });

  it("drops segments Whisper marks as probably not speech", async () => {
    const wav = encodeWav([channel(4, [[1, 3]]), new Float32Array(4 * RATE)], RATE);
    const transcribe = vi.fn().mockResolvedValue({
      language: "english",
      segments: [{ start: 0, end: 1, text: "Thank you.", avgLogprob: -1.5, noSpeechProb: 0.95 }],
    });

    const transcript = await transcribeRecording(wav, "audio/wav", transcribe);

    expect(transcript.segments).toEqual([]);
    expect(transcribe).toHaveBeenCalledTimes(1);
  });
});

describe("decoder limits (security review)", () => {
  it("refuses a WAV whose header says it is longer than 2 hours, before decoding it", async () => {
    const wav = encodeWav([new Float32Array(1600), new Float32Array(1600)], RATE);
    const view = new DataView(wav.buffer);
    view.setUint32(40, 3 * 60 * 60 * RATE * 4, true);

    await expect(decodeAudio(wav, "audio/wav")).rejects.toThrow(
      /longer than 2 hours|not a readable/,
    );
  });

  it("refuses a WAV with a zero sample rate", async () => {
    const wav = encodeWav([new Float32Array(160), new Float32Array(160)], RATE);
    new DataView(wav.buffer).setUint32(24, 0, true);

    await expect(decodeAudio(wav, "audio/wav")).rejects.toThrow(AudioError);
  });
});
