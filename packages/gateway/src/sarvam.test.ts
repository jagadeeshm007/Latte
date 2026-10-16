import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { ConfigurationError, ProviderError, RateLimitedError } from "./errors.ts";
import { createGateway, type GatewayConfig } from "./gateway.ts";
import { MemoryUsageStore } from "./memory-store.ts";

// Sarvam serves regional speech-to-text and translation through its SDK, which
// is handed the gateway's fetch: these tests never reach the network.

async function config(overrides: Partial<GatewayConfig> = {}): Promise<GatewayConfig> {
  return {
    mode: "live",
    budgetUsd: 5,
    cassetteDir: await mkdtemp(path.join(tmpdir(), "cassettes-")),
    apiKeys: { groq: "groq-key", sarvam: "sarvam-key" },
    routes: {
      chat: { provider: "groq", model: "openai/gpt-oss-120b" },
      stt: { provider: "groq", model: "whisper-large-v3" },
      tts: { provider: "groq", model: "canopylabs/orpheus-v1-english" },
      sttRegional: { provider: "sarvam", model: "saaras:v4" },
      ttsRegional: { provider: "sarvam", model: "bulbul:v3" },
      translate: { provider: "sarvam", model: "sarvam-translate:v1" },
    },
    ...overrides,
  };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const sttReply = {
  request_id: "r1",
  transcript: "नमस्ते सर। यह प्लान गारंटीड रिटर्न देता है।",
  language_code: "hi-IN",
  timestamps: {
    words: ["नमस्ते सर।", "यह प्लान गारंटीड रिटर्न देता है।"],
    start_time_seconds: [0.2, 1.5],
    end_time_seconds: [1.2, 4.1],
  },
};

const regionalStt = {
  kind: "stt" as const,
  audio: new Uint8Array([1, 2, 3]),
  filename: "call-agent-0.wav",
  durationSeconds: 5,
  regional: true,
  language: "hi-IN",
  keyterms: ["Suraksha"],
};

/** The headers of the n-th fetch, whatever shape the SDK passed them in. */
function headersOf(fetch: ReturnType<typeof vi.fn>, n = 0): Headers {
  const init = (fetch.mock.calls[n] as [string, RequestInit])[1];
  return new Headers(init.headers);
}

describe("sarvam speech-to-text", () => {
  it("sends regional audio to saaras with its language and maps chunk timestamps to segments", async () => {
    const fetch = vi.fn().mockResolvedValue(json(sttReply));
    const store = new MemoryUsageStore();
    const gw = createGateway(await config(), store, { fetch });

    const result = await gw.callModel(regionalStt, { purpose: "transcribe", callId: "c1" });

    const [url] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.sarvam.ai/speech-to-text");
    expect(headersOf(fetch).get("api-subscription-key")).toBe("sarvam-key");
    const form = (fetch.mock.calls[0] as [string, RequestInit])[1].body as FormData;
    expect(form.get("model")).toBe("saaras:v4");
    expect(form.get("language_code")).toBe("hi-IN");
    expect(form.get("with_timestamps")).toBe("true");
    expect(result.language).toBe("hi-IN");
    expect(result.words).toEqual([]);
    expect(result.segments).toEqual([
      { start: 0.2, end: 1.2, text: "नमस्ते सर।", avgLogprob: null, noSpeechProb: null },
      {
        start: 1.5,
        end: 4.1,
        text: "यह प्लान गारंटीड रिटर्न देता है।",
        avgLogprob: null,
        noSpeechProb: null,
      },
    ]);
    // ₹30 an hour, billed per second, converted at the rate in pricing.ts.
    expect(result.costUsd).toBeGreaterThan(0);
    expect(store.rows[0]).toMatchObject({ provider: "sarvam", model: "saaras:v4", status: "ok" });
  });

  it("keeps the whole transcript as one segment when no timestamps come back", async () => {
    const fetch = vi.fn().mockResolvedValue(json({ transcript: "नमस्ते", language_code: "hi-IN" }));
    const gw = createGateway(await config(), new MemoryUsageStore(), { fetch });

    const result = await gw.callModel(regionalStt, { purpose: "transcribe" });

    expect(result.segments).toEqual([
      { start: 0, end: 5, text: "नमस्ते", avgLogprob: null, noSpeechProb: null },
    ]);
  });

  it("sends English audio to Whisper, not Sarvam", async () => {
    const fetch = vi.fn().mockResolvedValue(json({ text: "hi", duration: 5, segments: [] }));
    const gw = createGateway(await config(), new MemoryUsageStore(), { fetch });

    await gw.callModel({ ...regionalStt, regional: false }, { purpose: "transcribe" });

    expect((fetch.mock.calls[0] as [string])[0]).toContain("api.groq.com");
  });

  it("turns a 429 into a rate-limit wait and does not retry inside the SDK", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(json({ error: "slow down" }, 429, { "retry-after": "7" }));
    const gw = createGateway(await config(), new MemoryUsageStore(), { fetch });

    const call = gw.callModel(regionalStt, { purpose: "transcribe" });

    await expect(call).rejects.toBeInstanceOf(RateLimitedError);
    await expect(call).rejects.toMatchObject({ waitMs: 7000 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports a refused request as a provider error, once", async () => {
    const fetch = vi.fn().mockResolvedValue(json({ error: { message: "bad audio" } }, 400));
    const store = new MemoryUsageStore();
    const gw = createGateway(await config(), store, { fetch });

    await expect(gw.callModel(regionalStt, { purpose: "transcribe" })).rejects.toBeInstanceOf(
      ProviderError,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(store.rows[0]).toMatchObject({ status: "error" });
  });

  it("refuses regional audio when no regional route is configured", async () => {
    const base = await config();
    const gw = createGateway(
      { ...base, routes: { chat: base.routes.chat, stt: base.routes.stt, tts: base.routes.tts } },
      new MemoryUsageStore(),
      { fetch: vi.fn() },
    );

    await expect(gw.callModel(regionalStt, { purpose: "transcribe" })).rejects.toBeInstanceOf(
      ConfigurationError,
    );
  });
});

describe("sarvam text-to-speech", () => {
  it("voices a regional line with Bulbul and returns the WAV audio", async () => {
    const wav = Buffer.from("RIFF-fake-wav").toString("base64");
    const fetch = vi.fn().mockResolvedValue(json({ request_id: "r", audios: [wav] }));
    const store = new MemoryUsageStore();
    const gw = createGateway(await config(), store, { fetch });

    const result = await gw.callModel(
      { kind: "tts", text: "నమస్కారం సర్", voice: "rahul", regional: true, language: "te-IN" },
      { purpose: "seed_tts" },
    );

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.sarvam.ai/text-to-speech");
    expect(JSON.parse(init.body as string)).toMatchObject({
      text: "నమస్కారం సర్",
      language_code: "te-IN",
      speaker: "rahul",
      model: "bulbul:v3",
      output_audio_codec: "wav",
    });
    expect(Buffer.from(result.audio).toString()).toBe("RIFF-fake-wav");
    expect(result.costUsd).toBeGreaterThan(0);
    expect(store.rows[0]).toMatchObject({ provider: "sarvam", kind: "tts", characters: 12 });
  });

  it("refuses a speaker Bulbul does not have", async () => {
    const gw = createGateway(await config(), new MemoryUsageStore(), { fetch: vi.fn() });

    await expect(
      gw.callModel(
        { kind: "tts", text: "hi", voice: "troy", regional: true, language: "hi-IN" },
        { purpose: "seed_tts" },
      ),
    ).rejects.toBeInstanceOf(ConfigurationError);
  });
});

describe("sarvam translation", () => {
  it("translates text to English and bills by character", async () => {
    const fetch = vi.fn().mockResolvedValue(
      json({
        translated_text: "This plan gives guaranteed returns.",
        source_language_code: "hi-IN",
      }),
    );
    const store = new MemoryUsageStore();
    const gw = createGateway(await config(), store, { fetch });

    const result = await gw.callModel(
      {
        kind: "translate",
        text: "यह प्लान गारंटीड रिटर्न देता है।",
        source: "hi-IN",
        target: "en-IN",
      },
      { purpose: "translate", callId: "c1" },
    );

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.sarvam.ai/translate");
    expect(JSON.parse(init.body as string)).toMatchObject({
      input: "यह प्लान गारंटीड रिटर्न देता है।",
      source_language_code: "hi-IN",
      target_language_code: "en-IN",
      model: "sarvam-translate:v1",
    });
    expect(result.text).toBe("This plan gives guaranteed returns.");
    expect(result.costUsd).toBeGreaterThan(0);
    expect(store.rows[0]).toMatchObject({ kind: "translate", characters: 32 });
  });

  it("refuses an unpriced Sarvam model at start-up", async () => {
    const base = await config();

    expect(() =>
      createGateway(
        {
          ...base,
          routes: { ...base.routes, translate: { provider: "sarvam", model: "mystery" } },
        },
        new MemoryUsageStore(),
      ),
    ).toThrow(ConfigurationError);
  });
});
