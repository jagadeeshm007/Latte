// Energy voice activity detection for one channel. Each channel of a stereo
// call is silent while the other party talks, so trimming silence roughly
// halves billed audio and rate-limit use (HLD section 8). The time map turns
// times in the trimmed audio back into call time (AC-US-01-002-3).

export interface Region {
  startMs: number;
  endMs: number;
}

export interface VadOptions {
  frameMs?: number;
  /** dB above the noise floor that counts as speech. */
  marginDb?: number;
  /** Never treat audio quieter than this as speech. */
  minDb?: number;
  /** Always treat audio louder than this as speech, even on a channel that is mostly speech. */
  maxThresholdDb?: number;
  hangoverMs?: number;
  padMs?: number;
  mergeGapMs?: number;
  minRegionMs?: number;
}

const DEFAULTS: Required<VadOptions> = {
  frameMs: 30,
  marginDb: 12,
  minDb: -45,
  maxThresholdDb: -35,
  hangoverMs: 300,
  padMs: 200,
  mergeGapMs: 600,
  minRegionMs: 250,
};

export function detectSpeech(
  samples: Float32Array,
  sampleRate: number,
  options: VadOptions = {},
): Region[] {
  const o = { ...DEFAULTS, ...options };
  const frame = Math.max(1, Math.round((sampleRate * o.frameMs) / 1000));
  const frames = Math.floor(samples.length / frame);
  if (frames === 0) {
    return [];
  }
  const db = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * frame; i < (f + 1) * frame; i++) {
      const s = samples[i] ?? 0;
      sum += s * s;
    }
    db[f] = 10 * Math.log10(sum / frame + 1e-12);
  }
  const sorted = Array.from(db).sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)] ?? -120;
  // The floor is a percentile, so a channel that is mostly speech would put it at
  // speech level; the cap keeps ordinary speech above the threshold.
  const threshold = Math.min(Math.max(floor + o.marginDb, o.minDb), o.maxThresholdDb);

  const hangFrames = Math.round(o.hangoverMs / o.frameMs);
  const regions: Region[] = [];
  let start = -1;
  let lastVoiced = -1;
  for (let f = 0; f < frames; f++) {
    if ((db[f] ?? -120) > threshold) {
      if (start < 0) {
        start = f;
      }
      lastVoiced = f;
    } else if (start >= 0 && f - lastVoiced > hangFrames) {
      regions.push({ startMs: start * o.frameMs, endMs: (lastVoiced + 1) * o.frameMs });
      start = -1;
    }
  }
  if (start >= 0) {
    regions.push({ startMs: start * o.frameMs, endMs: (lastVoiced + 1) * o.frameMs });
  }

  const totalMs = Math.floor((samples.length / sampleRate) * 1000);
  const padded = regions.map((r) => ({
    startMs: Math.max(0, r.startMs - o.padMs),
    endMs: Math.min(totalMs, r.endMs + o.padMs),
  }));
  const merged: Region[] = [];
  for (const r of padded) {
    const last = merged[merged.length - 1];
    if (last && r.startMs - last.endMs < o.mergeGapMs) {
      last.endMs = Math.max(last.endMs, r.endMs);
    } else {
      merged.push({ ...r });
    }
  }
  return merged.filter((r) => r.endMs - r.startMs >= o.minRegionMs);
}

export interface MapEntry {
  srcStartMs: number;
  dstStartMs: number;
  durationMs: number;
}

export interface Chunk {
  samples: Float32Array;
  durationMs: number;
  map: MapEntry[];
}

/** Silence inserted between regions so Whisper ends a segment at each gap. */
export const GAP_MS = 400;

/**
 * buildChunks concatenates the speech regions (with short gaps) into chunks of
 * at most maxChunkMs, each with the map from chunk time back to call time.
 */
export function buildChunks(
  samples: Float32Array,
  sampleRate: number,
  regions: Region[],
  maxChunkMs = 10 * 60 * 1000,
  /** One chunk per region: for engines that time a whole request as one line (Sarvam). */
  onePerRegion = false,
): Chunk[] {
  const chunks: Chunk[] = [];
  let parts: Float32Array[] = [];
  let map: MapEntry[] = [];
  let cursorMs = 0;
  const gap = new Float32Array(Math.round((sampleRate * GAP_MS) / 1000));
  const flush = () => {
    if (parts.length === 0) {
      return;
    }
    const total = parts.reduce((s, p) => s + p.length, 0);
    const joined = new Float32Array(total);
    let offset = 0;
    for (const p of parts) {
      joined.set(p, offset);
      offset += p.length;
    }
    chunks.push({ samples: joined, durationMs: Math.round((total / sampleRate) * 1000), map });
    parts = [];
    map = [];
    cursorMs = 0;
  };
  // A region longer than a chunk (a long monologue) is cut into chunk-sized pieces.
  const pieces: Region[] = regions.flatMap((r) => splitAtQuiet(samples, sampleRate, r, maxChunkMs));
  for (const r of pieces) {
    const duration = r.endMs - r.startMs;
    if (cursorMs > 0 && (onePerRegion || cursorMs + duration > maxChunkMs)) {
      flush();
    }
    if (cursorMs > 0) {
      parts.push(gap);
      cursorMs += GAP_MS;
    }
    const from = Math.floor((r.startMs / 1000) * sampleRate);
    const to = Math.min(samples.length, Math.floor((r.endMs / 1000) * sampleRate));
    parts.push(samples.subarray(from, to));
    map.push({ srcStartMs: r.startMs, dstStartMs: cursorMs, durationMs: duration });
    cursorMs += duration;
  }
  flush();
  return chunks;
}

const CUT_FRAME_MS = 100;
const CUT_STEP_MS = 10;

/**
 * splitAtQuiet cuts a region longer than maxMs into pieces of at most maxMs,
 * each cut at the quietest moment in the second half of its window: a breath
 * or a pause between sentences rather than the middle of a word.
 */
export function splitAtQuiet(
  samples: Float32Array,
  sampleRate: number,
  region: Region,
  maxMs: number,
): Region[] {
  const out: Region[] = [];
  let start = region.startMs;
  while (region.endMs - start > maxMs) {
    const from = start + maxMs / 2;
    const to = start + maxMs - CUT_FRAME_MS;
    let cut = start + maxMs;
    let quietest = Number.POSITIVE_INFINITY;
    for (let t = from; t <= to; t += CUT_STEP_MS) {
      const a = Math.floor((t / 1000) * sampleRate);
      const b = Math.min(samples.length, Math.floor(((t + CUT_FRAME_MS) / 1000) * sampleRate));
      let energy = 0;
      for (let i = a; i < b; i++) {
        const v = samples[i] ?? 0;
        energy += v * v;
      }
      if (energy < quietest) {
        quietest = energy;
        cut = Math.round(t + CUT_FRAME_MS / 2);
      }
    }
    out.push({ startMs: start, endMs: cut });
    start = cut;
  }
  out.push({ startMs: start, endMs: region.endMs });
  return out;
}

/** toCallTime maps a time in a chunk to call time; a time inside a gap snaps to the nearest region edge. */
export function toCallTime(map: MapEntry[], dstMs: number): number {
  let best = map[0];
  for (const entry of map) {
    if (dstMs >= entry.dstStartMs) {
      best = entry;
    } else {
      break;
    }
  }
  if (!best) {
    return Math.round(dstMs);
  }
  const offset = Math.min(Math.max(0, dstMs - best.dstStartMs), best.durationMs);
  return Math.round(best.srcStartMs + offset);
}
