// Voices the seed scripts into stereo calls (agent left, customer right) with
// Groq Orpheus through the gateway (ADR-0007), then transcribes each finished
// call with the same pipeline the worker uses and saves the transcript as an
// eval fixture. Every voiced line is cached on disk, so a run stopped by the
// daily request cap resumes where it left off.
//
//   pnpm --filter @scc/evals render                 every call
//   pnpm --filter @scc/evals render 02-guaranteed   calls whose id starts with this
//   pnpm --filter @scc/evals render -- --probe      one line, to check the voice works
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { transcribeRecording } from "@scc/api/transcribe";
import { encodeWav, resample } from "@scc/api/wav";
import { createGateway, MemoryUsageStore, RateLimitedError } from "@scc/gateway";
import type * as Wavefile from "wavefile";

import type { Planted } from "./eval.ts";
import { CALLS, type CallScript } from "./scripts.ts";
import { wordErrorRate } from "./wer.ts";

// wavefile ships CommonJS that Node ESM cannot read named exports from; load it with require.
const { WaveFile } = createRequire(import.meta.url)("wavefile") as typeof Wavefile;

const ROOT = path.resolve(import.meta.dirname, "..");
const LINES = path.join(ROOT, "audio", "lines");
const OUT = path.join(ROOT, "audio", "calls");
const FIXTURES = path.join(ROOT, "fixtures", "transcripts");
const RATE = 24_000;
const GAP_S = 0.6;
const MAX_WAIT_MS = 90_000;
for (const dir of [LINES, OUT, FIXTURES]) mkdirSync(dir, { recursive: true });

const store = new MemoryUsageStore();
const gateway = createGateway(
  {
    mode: "live",
    budgetUsd: Number(process.env.RENDER_BUDGET_USD ?? "2"),
    cassetteDir: path.join(ROOT, "cassettes"),
    apiKeys: process.env.GROQ_API_KEY ? { groq: process.env.GROQ_API_KEY } : {},
    routes: {
      chat: { provider: "groq", model: "openai/gpt-oss-120b" },
      stt: { provider: "groq", model: process.env.STT_MODEL ?? "whisper-large-v3" },
      tts: { provider: "groq", model: process.env.TTS_MODEL ?? "canopylabs/orpheus-v1-english" },
    },
    limits: { "canopylabs/orpheus-v1-english": { rpm: 10 } },
  },
  store,
);

class StopForToday extends Error {}

/** withRetry waits out short rate limits and stops the run on long ones (the daily cap). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof RateLimitedError)) throw error;
      if (error.waitMs > MAX_WAIT_MS)
        throw new StopForToday(
          `rate limit resets in ${String(Math.ceil(error.waitMs / 60_000))} min`,
        );
      await sleep(error.waitMs + 250);
    }
  }
}

function decodeMono(bytes: Uint8Array): Float32Array {
  const wav = new WaveFile(bytes);
  const { sampleRate, numChannels } = wav.fmt as { sampleRate: number; numChannels: number };
  wav.toBitDepth("32f");
  const samples = wav.getSamples(false, Float32Array) as unknown;
  const mono = numChannels > 1 ? (samples as Float32Array[])[0] : (samples as Float32Array);
  return resample(mono ?? new Float32Array(0), sampleRate, RATE);
}

/** Orpheus takes short inputs; long lines are voiced sentence by sentence and joined. */
function pieces(text: string): string[] {
  if (text.length <= 180) return [text];
  return text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text];
}

async function voiceLine(text: string, voice: string): Promise<Float32Array> {
  const parts: Float32Array[] = [];
  for (const piece of pieces(text)) {
    const file = path.join(
      LINES,
      `${createHash("sha1").update(`${voice}|${piece}`).digest("hex")}.wav`,
    );
    if (!existsSync(file)) {
      const result = await withRetry(() =>
        gateway.callModel({ kind: "tts", text: piece, voice }, { purpose: "seed_tts" }),
      );
      writeFileSync(file, result.audio);
    }
    parts.push(decodeMono(readFileSync(file)));
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const joined = new Float32Array(total);
  let offset = 0;
  for (const p of parts) {
    joined.set(p, offset);
    offset += p.length;
  }
  return joined;
}

async function renderCall(call: CallScript): Promise<void> {
  const voiced: Float32Array[] = [];
  for (const line of call.lines) {
    voiced.push(await voiceLine(line.t, line.s === "A" ? call.voices.agent : call.voices.customer));
  }
  const totalSamples = Math.ceil(
    RATE * (0.5 + voiced.reduce((s, v) => s + v.length / RATE + GAP_S, 0)),
  );
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const planted: Planted[] = [];
  let t = 0.5;
  call.lines.forEach((line, i) => {
    const samples = voiced[i] ?? new Float32Array(0);
    (line.s === "A" ? left : right).set(samples, Math.round(t * RATE));
    const startMs = Math.round(t * 1000);
    const endMs = Math.round((t + samples.length / RATE) * 1000);
    if (line.plant) planted.push({ key: line.plant, startMs, endMs, text: line.t });
    t += samples.length / RATE + GAP_S;
  });
  const wav = encodeWav([left, right], RATE);
  writeFileSync(path.join(OUT, `${call.id}.wav`), wav);

  const transcript = await transcribeRecording(
    wav,
    "audio/wav",
    async (chunk, durationSeconds, label) => {
      const r = await withRetry(() =>
        gateway.callModel(
          { kind: "stt", audio: chunk, filename: `${call.id}-${label}.wav`, durationSeconds },
          { purpose: "seed_stt" },
        ),
      );
      return { language: r.language, segments: r.segments };
    },
  );
  const segments = transcript.segments.map((s) => ({
    seq: s.seq,
    channel: s.channel,
    startMs: s.startMs,
    endMs: s.endMs,
    text: s.text,
  }));
  writeFileSync(
    path.join(FIXTURES, `${call.id}.json`),
    `${JSON.stringify({ segments, planted }, null, 2)}\n`,
  );
  const wer = wordErrorRate(
    call.lines.map((l) => l.t).join(" "),
    segments.map((s) => s.text).join(" "),
  );
  process.stdout.write(
    `rendered ${call.id}: ${(transcript.durationMs / 1000).toFixed(0)} s, ${String(segments.length)} segments, WER ${(wer * 100).toFixed(1)}%\n`,
  );
}

const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.includes("--probe")) {
  const audio = await voiceLine("Good morning, this is Ravi from Suraksha Life.", "troy");
  process.stdout.write(`probe: ${(audio.length / RATE).toFixed(2)} s of audio\n`);
  process.exit(0);
}
const prefix = args.find((a) => !a.startsWith("--")) ?? "";
let done = 0;
try {
  for (const call of CALLS.filter((c) => c.id.startsWith(prefix))) {
    if (existsSync(path.join(FIXTURES, `${call.id}.json`)) && !args.includes("--force")) {
      done++;
      continue;
    }
    await renderCall(call);
    done++;
  }
} catch (error) {
  if (!(error instanceof StopForToday)) throw error;
  process.stdout.write(`render: stopped, ${error.message}; run again later to continue\n`);
}
const spent = store.rows.reduce((s, r) => s + r.costUsd, 0);
process.stdout.write(
  `render: ${String(done)} calls ready, spent ${spent.toFixed(4)} USD this run\n`,
);
