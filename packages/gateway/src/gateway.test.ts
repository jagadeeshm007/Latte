import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  BudgetExceededError,
  CassetteMissingError,
  ConfigurationError,
  ProviderError,
  RateLimitedError,
} from "./errors.ts";
import { createGateway, type GatewayConfig, MAX_TOKENS_CAP } from "./gateway.ts";
import { MemoryUsageStore } from "./memory-store.ts";

const routes: GatewayConfig["routes"] = {
  chat: { provider: "groq", model: "openai/gpt-oss-120b" },
  stt: { provider: "groq", model: "whisper-large-v3" },
  tts: { provider: "groq", model: "canopylabs/orpheus-v1-english" },
};

async function config(overrides: Partial<GatewayConfig> = {}): Promise<GatewayConfig> {
  return {
    mode: "live",
    budgetUsd: 5,
    cassetteDir: await mkdtemp(path.join(tmpdir(), "cassettes-")),
    apiKeys: { groq: "test-key" },
    routes,
    ...overrides,
  };
}

function chatResponse(content = '{"ok":true}', usage: Record<string, unknown> = { prompt_tokens: 3000, completion_tokens: 500 }) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }], usage }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const chat = { kind: "chat" as const, messages: [{ role: "user" as const, content: "hello" }] };

describe("callModel chat", () => {
  it("caps max tokens at 1000 whatever the caller asks", async () => {
    const fetch = vi.fn().mockResolvedValue(chatResponse());
    const gw = createGateway(await config(), new MemoryUsageStore(), { fetch });
    await gw.callModel({ ...chat, maxTokens: 4000 }, { purpose: "test" });
    const body = JSON.parse((fetch.mock.calls[0]![1] as RequestInit).body as string) as Record<string, unknown>;
    expect(body.max_completion_tokens).toBe(MAX_TOKENS_CAP);
  });

  it("logs one row with tokens and the cost from the price table", async () => {
    const store = new MemoryUsageStore();
    const gw = createGateway(await config(), store, { fetch: vi.fn().mockResolvedValue(chatResponse()) });
    const result = await gw.callModel(chat, { purpose: "score", callId: "c1" });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ status: "ok", inputTokens: 3000, outputTokens: 500, callId: "c1" });
    // 3000 x 0.15/M + 500 x 0.60/M
    expect(result.costUsd).toBeCloseTo(0.00075, 8);
    expect(result.modelCallId).toBe(store.rows[0]!.id);
  });

  it("prices cached input tokens at half", async () => {
    const usage = { prompt_tokens: 3000, completion_tokens: 0, prompt_tokens_details: { cached_tokens: 2000 } };
    const gw = createGateway(await config(), new MemoryUsageStore(), {
      fetch: vi.fn().mockResolvedValue(chatResponse("x", usage)),
    });
    const result = await gw.callModel(chat, { purpose: "t" });
    expect(result.costUsd).toBeCloseTo((1000 * 0.15 + 2000 * 0.075) / 1e6, 10);
  });

  it("refuses once the month's spend reaches the budget and sends nothing", async () => {
    const fetch = vi.fn();
    const store = new MemoryUsageStore(5);
    const gw = createGateway(await config(), store, { fetch });
    await expect(gw.callModel(chat, { purpose: "score" })).rejects.toBeInstanceOf(BudgetExceededError);
    expect(fetch).not.toHaveBeenCalled();
    expect(store.rows[0]).toMatchObject({ status: "refused", costUsd: 0 });
  });

  it("turns a 429 into RateLimitedError with the provider's retry-after and blocks the model", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("slow down", { status: 429, headers: { "retry-after": "7" } }));
    const gw = createGateway(await config(), new MemoryUsageStore(), { fetch });
    const error = (await gw.callModel(chat, { purpose: "t" }).catch((e: unknown) => e)) as RateLimitedError;
    expect(error).toBeInstanceOf(RateLimitedError);
    expect(error.waitMs).toBe(7000);
    await expect(gw.callModel(chat, { purpose: "t" })).rejects.toBeInstanceOf(RateLimitedError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a 5xx twice, then records an error row", async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response("boom", { status: 503 })));
    const store = new MemoryUsageStore();
    const gw = createGateway(await config(), store, { fetch, sleep: () => Promise.resolve() });
    await expect(gw.callModel(chat, { purpose: "t" })).rejects.toBeInstanceOf(ProviderError);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(store.rows[0]).toMatchObject({ status: "error" });
  });

  it("waits instead of sending when the per-minute request limit is used up", async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(chatResponse()));
    const gw = createGateway(await config({ limits: { "openai/gpt-oss-120b": { rpm: 1 } } }), new MemoryUsageStore(), {
      fetch,
    });
    await gw.callModel(chat, { purpose: "t" });
    await expect(gw.callModel(chat, { purpose: "t" })).rejects.toBeInstanceOf(RateLimitedError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("sends a strict json_schema response format", async () => {
    const fetch = vi.fn().mockResolvedValue(chatResponse());
    const gw = createGateway(await config(), new MemoryUsageStore(), { fetch });
    await gw.callModel(
      { ...chat, jsonSchema: { name: "j", schema: { type: "object" } }, reasoningEffort: "low" },
      { purpose: "t" },
    );
    const body = JSON.parse((fetch.mock.calls[0]![1] as RequestInit).body as string) as {
      response_format: { json_schema: { strict: boolean } };
      reasoning_effort: string;
    };
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.reasoning_effort).toBe("low");
  });
});

describe("record and replay", () => {
  it("records a cassette, then replays it with no network", async () => {
    const cfg = await config({ mode: "record" });
    const live = createGateway(cfg, new MemoryUsageStore(), { fetch: vi.fn().mockResolvedValue(chatResponse("hi")) });
    await live.callModel(chat, { purpose: "t" });
    expect(await readdir(cfg.cassetteDir)).toHaveLength(1);

    const offline = vi.fn().mockRejectedValue(new Error("network is off"));
    const replay = createGateway({ ...cfg, mode: "replay", apiKeys: {} }, new MemoryUsageStore(), { fetch: offline });
    const result = await replay.callModel(chat, { purpose: "t" });
    expect(result.content).toBe("hi");
    expect(offline).not.toHaveBeenCalled();
  });

  it("fails clearly in replay when nothing was recorded", async () => {
    const gw = createGateway(await config({ mode: "replay" }), new MemoryUsageStore());
    await expect(gw.callModel(chat, { purpose: "t" })).rejects.toBeInstanceOf(CassetteMissingError);
  });
});

describe("stt and tts", () => {
  it("bills transcription per audio hour with the 10 second minimum", async () => {
    const body = { text: "hi", language: "english", duration: 4, segments: [{ start: 0, end: 4, text: " hi " }] };
    const gw = createGateway(await config(), new MemoryUsageStore(), {
      fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
    });
    const result = await gw.callModel(
      { kind: "stt", audio: new Uint8Array([1, 2, 3]), filename: "a.wav", durationSeconds: 4 },
      { purpose: "transcribe" },
    );
    expect(result.costUsd).toBeCloseTo((10 * 0.111) / 3600, 10);
    expect(result.segments[0]).toMatchObject({ start: 0, end: 4, text: "hi" });
  });

  it("returns speech audio and bills per character", async () => {
    const gw = createGateway(await config(), new MemoryUsageStore(), {
      fetch: vi.fn().mockResolvedValue(new Response(new Uint8Array([9, 9]), { status: 200 })),
    });
    const result = await gw.callModel({ kind: "tts", text: "hello", voice: "troy" }, { purpose: "seed_tts" });
    expect([...result.audio]).toEqual([9, 9]);
    expect(result.costUsd).toBeCloseTo((5 * 22) / 1e6, 12);
  });
});

describe("configuration", () => {
  it("refuses a provider that cannot serve a kind", async () => {
    await expect(async () =>
      createGateway(await config({ routes: { ...routes, stt: { provider: "gemini", model: "x" } } }), new MemoryUsageStore()),
    ).rejects.toBeInstanceOf(ConfigurationError);
  });

  it("refuses an unpriced model", async () => {
    await expect(async () =>
      createGateway(await config({ routes: { ...routes, chat: { provider: "groq", model: "mystery" } } }), new MemoryUsageStore()),
    ).rejects.toBeInstanceOf(ConfigurationError);
  });

  it("refuses a live call with no API key", async () => {
    const gw = createGateway(await config({ apiKeys: {} }), new MemoryUsageStore(), { fetch: vi.fn() });
    await expect(gw.callModel(chat, { purpose: "t" })).rejects.toBeInstanceOf(ConfigurationError);
  });
});
