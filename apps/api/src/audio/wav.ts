// A minimal PCM WAV writer: 16-bit little endian, the format Whisper and the
// seed renderer need. Decoding of uploads lives in decode.ts.

export function encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array {
  const numChannels = channels.length;
  const length = channels[0]?.length ?? 0;
  const dataBytes = length * numChannels * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c]?.[i] ?? 0));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
}

/** resample converts to a new rate with a box low-pass and linear interpolation; enough for speech. */
export function resample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) {
    return samples;
  }
  const ratio = fromRate / toRate;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLength);
  if (ratio > 1) {
    // Prefix sums give the mean over each output sample's source window in O(1).
    const prefix = new Float64Array(samples.length + 1);
    for (let i = 0; i < samples.length; i++) {
      prefix[i + 1] = (prefix[i] ?? 0) + (samples[i] ?? 0);
    }
    for (let i = 0; i < outLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
      out[i] = ((prefix[end] ?? 0) - (prefix[start] ?? 0)) / (end - start);
    }
    return out;
  }
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const left = Math.floor(pos);
    const frac = pos - left;
    const a = samples[left] ?? 0;
    const b = samples[Math.min(left + 1, samples.length - 1)] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}
