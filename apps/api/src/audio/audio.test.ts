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

  it("cuts one long stretch of speech at its quietest point, not mid-word", () => {
    // 50 s of continuous speech with one soft dip at 20.0-20.2 s, as between two sentences.
    const samples = channel(50, [[0, 50]]);
    for (let i = 20 * RATE; i < 20.2 * RATE; i++) samples[i] = samples[i]! * 0.02;
    const region = { startMs: 0, endMs: 50_000 };

    const chunks = buildChunks(samples, RATE, [region], 28_000);

    // Cut at the dip (about 20 s), not at the fixed 28 s mark; no chunk passes 28 s.
    const firstEnd = chunks[0]!.map[0]!.srcStartMs + chunks[0]!.map[0]!.durationMs;
    expect(Math.abs(firstEnd - 20_100)).toBeLessThan(200);
    expect(Math.max(...chunks.map((c) => c.durationMs))).toBeLessThanOrEqual(28_000);
    // Nothing is lost: the pieces cover the whole region.
    expect(chunks.reduce((sum, c) => sum + c.map.reduce((t, m) => t + m.durationMs, 0), 0)).toBe(
      50_000,
    );
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
        words: [],
      })
      .mockResolvedValueOnce({
        language: "hindi",
        segments: [
          { start: 0.2, end: 1.5, text: "haan boliye", avgLogprob: -0.3, noSpeechProb: 0.02 },
        ],
        words: [],
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
      words: [
        { text: "Thank", start: 0.1, end: 0.4 },
        { text: "you.", start: 0.4, end: 0.8 },
      ],
    });

    const transcript = await transcribeRecording(wav, "audio/wav", transcribe);

    expect(transcript.segments).toEqual([]);
    expect(transcribe).toHaveBeenCalledTimes(1);
  });

  it("puts each word on the segment it was spoken in, in call time", async () => {
    const wav = encodeWav([channel(12, [[6, 8]]), new Float32Array(12 * RATE)], RATE);
    const transcribe = vi.fn().mockResolvedValue({
      language: "english",
      segments: [
        { start: 0.2, end: 0.9, text: "Hello sir", avgLogprob: -0.2, noSpeechProb: 0.01 },
        { start: 1.0, end: 1.8, text: "good morning", avgLogprob: -0.2, noSpeechProb: 0.01 },
      ],
      words: [
        { text: "Hello", start: 0.2, end: 0.5 },
        { text: "sir", start: 0.5, end: 0.9 },
        { text: "good", start: 1.0, end: 1.3 },
        // Ends a touch after its segment: still placed by its midpoint.
        { text: "morning", start: 1.4, end: 1.95 },
        // Between and outside every segment: goes to the nearest one.
        { text: "uh", start: 2.2, end: 2.4 },
      ],
    });

    const transcript = await transcribeRecording(wav, "audio/wav", transcribe);

    const [first, second] = transcript.segments;
    expect(first!.words.map((w) => w.text)).toEqual(["Hello", "sir"]);
    expect(second!.words.map((w) => w.text)).toEqual(["good", "morning", "uh"]);
    // The chunk starts before the speech at 6 s, so call time is well past 5 s.
    expect(first!.words[0]!.startMs).toBeGreaterThan(5000);
    expect(first!.words[0]!.startMs).toBe(first!.startMs);
    expect(first!.words[1]!.endMs).toBeGreaterThan(first!.words[1]!.startMs);
  });

  it("drops the words of a segment it drops as not speech", async () => {
    const wav = encodeWav([channel(4, [[1, 3]]), new Float32Array(4 * RATE)], RATE);
    const transcribe = vi.fn().mockResolvedValue({
      language: "english",
      segments: [
        { start: 0, end: 1, text: "Thank you.", avgLogprob: -1.5, noSpeechProb: 0.95 },
        { start: 1, end: 2, text: "Hello", avgLogprob: -0.2, noSpeechProb: 0.01 },
      ],
      words: [
        { text: "Thank", start: 0.1, end: 0.4 },
        { text: "you.", start: 0.4, end: 0.8 },
        { text: "Hello", start: 1.1, end: 1.5 },
      ],
    });

    const transcript = await transcribeRecording(wav, "audio/wav", transcribe);

    expect(transcript.segments.map((s) => s.words.map((w) => w.text))).toEqual([["Hello"]]);
  });

  // SCC-1: Sarvam returns one timestamp chunk per request, so joining several
  // utterances into one request made one transcript line out of all of them.
  it("sends each utterance on its own when asked, so each keeps its own times", async () => {
    const wav = encodeWav(
      [
        channel(30, [
          [1, 3],
          [10, 12],
          [20, 22],
        ]),
        new Float32Array(30 * RATE),
      ],
      RATE,
    );
    const transcribe = vi.fn((_wav: Uint8Array, seconds: number) =>
      Promise.resolve({
        language: "hi-IN",
        segments: [{ start: 0, end: seconds, text: "line", avgLogprob: null, noSpeechProb: null }],
        words: [],
      }),
    );

    const transcript = await transcribeRecording(wav, "audio/wav", transcribe, {
      maxChunkMs: 28_000,
      onePerUtterance: true,
    });

    expect(transcribe).toHaveBeenCalledTimes(3);
    expect(transcript.segments.map((s) => Math.round(s.startMs / 1000))).toEqual([1, 10, 20]);
    for (const s of transcript.segments) expect(s.endMs - s.startMs).toBeLessThan(3000);
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
