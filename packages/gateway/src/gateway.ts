import {
  type Cassette,
  loadCassette,
  type RecordedResponse,
  requestKey,
  saveCassette,
  sha256,
} from "./cassette.ts";
import {
  BudgetExceededError,
  CassetteMissingError,
  ConfigurationError,
  ProviderError,
  RateLimitedError,
} from "./errors.ts";
import { Limiter, type ModelLimits } from "./limiter.ts";
import { audioCost, charCost, type Price, priceFor, tokenCost } from "./pricing.ts";

// The one function every model call goes through (REQ-022, tenet 1). In order:
// pick provider and model, cap max_tokens at 1000, check the month's budget,
// reserve rate-limit room, send (or replay), price the call, write one
// model_calls row. Nothing else in the repository talks to a model.

export const MAX_TOKENS_CAP = 1000;

export type Provider = "groq" | "openrouter" | "gemini";
export type ModelKind = "chat" | "stt" | "tts";
export type GatewayMode = "live" | "replay" | "record";

export const PROVIDER_BASE_URLS: Record<Provider, string> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
};

/** Which kinds each provider can serve. Only Groq returns segment timestamps (ADR-0009). */
const SUPPORTS: Record<Provider, readonly ModelKind[]> = {
  groq: ["chat", "stt", "tts"],
  openrouter: ["chat"],
  gemini: ["chat"],
};

export interface Route {
  provider: Provider;
  model: string;
}

export interface GatewayConfig {
  mode: GatewayMode;
  budgetUsd: number;
  cassetteDir: string;
  apiKeys: Partial<Record<Provider, string>>;
  routes: Record<ModelKind, Route>;
  limits?: Record<string, ModelLimits>;
  timeoutMs?: number;
}

export interface ModelCallRow {
  provider: string;
  model: string;
  kind: ModelKind;
  purpose: string;
  callId: string | null;
  status: "ok" | "error" | "refused";
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  audioSeconds: number;
  characters: number;
  costUsd: number;
  latencyMs: number;
  error: string | null;
}

/** UsageStore is where cost rows live; the API wires it to the model_calls table. */
export interface UsageStore {
  monthSpendUsd(now: Date): Promise<number>;
  record(row: ModelCallRow): Promise<string>;
}

export interface CallContext {
  purpose: string;
  callId?: string | null;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  kind: "chat";
  messages: ChatMessage[];
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
}

export interface SttRequest {
  kind: "stt";
  /** A WAV file; Whisper downsamples to 16 kHz mono anyway. */
  audio: Uint8Array;
  filename: string;
  durationSeconds: number;
  language?: string;
  prompt?: string;
}

export interface TtsRequest {
  kind: "tts";
  text: string;
  voice: string;
}

export type ModelRequest = ChatRequest | SttRequest | TtsRequest;

export interface Usage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

export interface ChatResult {
  kind: "chat";
  content: string;
  finishReason: string;
  usage: Usage;
  costUsd: number;
  modelCallId: string;
  model: string;
}

export interface SttSegment {
  start: number;
  end: number;
  text: string;
  avgLogprob: number | null;
  noSpeechProb: number | null;
}

export interface SttResult {
  kind: "stt";
  text: string;
  language: string | null;
  durationSeconds: number;
  segments: SttSegment[];
  costUsd: number;
  modelCallId: string;
  model: string;
}

export interface TtsResult {
  kind: "tts";
  audio: Uint8Array;
  costUsd: number;
  modelCallId: string;
  model: string;
}

type ResultFor<R extends ModelRequest> = R extends ChatRequest
  ? ChatResult
  : R extends SttRequest
    ? SttResult
    : TtsResult;

export interface GatewayDeps {
  fetch?: typeof fetch;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface Gateway {
  callModel<R extends ModelRequest>(request: R, context: CallContext): Promise<ResultFor<R>>;
  routes: Record<ModelKind, Route>;
}

const RETRY_DELAYS_MS = [1000, 4000];

export function createGateway(
  config: GatewayConfig,
  store: UsageStore,
  deps: GatewayDeps = {},
): Gateway {
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const limiter = new Limiter(config.limits ?? {}, () => now().getTime());
  const timeoutMs = config.timeoutMs ?? 120_000;

  // Fail at start-up, not on the first call, for a route that cannot work.
  const prices = {} as Record<ModelKind, Price | null>;
  for (const kind of ["chat", "stt", "tts"] as const) {
    const route = config.routes[kind];
    if (!SUPPORTS[route.provider].includes(kind)) {
      throw new ConfigurationError(`${route.provider} cannot serve ${kind} calls`);
    }
    prices[kind] = priceFor(route.provider, route.model);
  }

  async function callModel<R extends ModelRequest>(
    request: R,
    context: CallContext,
  ): Promise<ResultFor<R>> {
    const route = config.routes[request.kind];
    const base: Omit<ModelCallRow, "status" | "costUsd" | "latencyMs" | "error"> = {
      provider: route.provider,
      model: route.model,
      kind: request.kind,
      purpose: context.purpose,
      callId: context.callId ?? null,
      inputTokens: 0,
      cachedTokens: 0,
      outputTokens: 0,
      audioSeconds: 0,
      characters: request.kind === "tts" ? request.text.length : 0,
    };

    const spent = await store.monthSpendUsd(now());
    if (spent >= config.budgetUsd) {
      await store.record({
        ...base,
        status: "refused",
        costUsd: 0,
        latencyMs: 0,
        error: "budget exhausted",
      });
      throw new BudgetExceededError(spent, config.budgetUsd);
    }

    const built = buildRequest(request, route);
    const key = requestKey({ provider: route.provider, model: route.model, ...built.keyParts });

    const wait = limiter.reserve(route.model, estimate(request));
    if (config.mode !== "replay" && wait > 0) {
      throw new RateLimitedError(wait, route.model);
    }

    const started = now().getTime();
    let response: RecordedResponse;
    try {
      response = await obtain(built, key, route);
    } catch (error) {
      if (!(error instanceof RateLimitedError || error instanceof CassetteMissingError)) {
        await store.record({
          ...base,
          status: "error",
          costUsd: 0,
          latencyMs: now().getTime() - started,
          error: error instanceof Error ? error.message.slice(0, 500) : "unknown error",
        });
      }
      throw error;
    }
    const latencyMs = now().getTime() - started;
    const parsed = parseResult(request, response, route, prices[request.kind]);
    const modelCallId = await store.record({
      ...base,
      ...parsed.usageRow,
      status: "ok",
      costUsd: parsed.costUsd,
      latencyMs,
      error: null,
    });
    return {
      ...parsed.result,
      costUsd: parsed.costUsd,
      modelCallId,
      model: route.model,
    } as ResultFor<R>;
  }

  async function obtain(built: BuiltRequest, key: string, route: Route): Promise<RecordedResponse> {
    if (config.mode === "replay") {
      const cassette = await loadCassette(config.cassetteDir, key);
      if (!cassette) {
        throw new CassetteMissingError(key);
      }
      return cassette.response;
    }
    const apiKey = config.apiKeys[route.provider];
    if (!apiKey) {
      throw new ConfigurationError(`no API key for ${route.provider}`);
    }
    const response = await sendWithRetry(built, apiKey, route);
    if (config.mode === "record") {
      const cassette: Cassette = { key, summary: built.summary, response };
      await saveCassette(config.cassetteDir, cassette);
    }
    return response;
  }

  async function sendWithRetry(
    built: BuiltRequest,
    apiKey: string,
    route: Route,
  ): Promise<RecordedResponse> {
    for (let attempt = 0; ; attempt++) {
      const res = await doFetch(`${PROVIDER_BASE_URLS[route.provider]}${built.path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, ...built.headers },
        body: built.body(),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") ?? "10");
        const waitMs = Math.max(1, Number.isFinite(retryAfter) ? retryAfter : 10) * 1000;
        limiter.block(route.model, waitMs);
        await res.body?.cancel();
        throw new RateLimitedError(waitMs, route.model);
      }
      if (res.status >= 500 && attempt < RETRY_DELAYS_MS.length) {
        await res.body?.cancel();
        await sleep(RETRY_DELAYS_MS[attempt] ?? 1000);
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ProviderError(
          res.status,
          `${route.provider} ${String(res.status)}: ${text.slice(0, 300)}`,
        );
      }
      const headers = { "content-type": res.headers.get("content-type") ?? "" };
      if (built.binary) {
        return {
          status: res.status,
          headers,
          base64: Buffer.from(await res.arrayBuffer()).toString("base64"),
        };
      }
      return { status: res.status, headers, json: await res.json() };
    }
  }

  return { callModel, routes: config.routes };
}

interface BuiltRequest {
  path: string;
  headers: Record<string, string>;
  body: () => string | FormData;
  keyParts: Record<string, unknown>;
  summary: string;
  binary: boolean;
}

function buildRequest(request: ModelRequest, route: Route): BuiltRequest {
  switch (request.kind) {
    case "chat": {
      const maxTokens = Math.min(request.maxTokens ?? MAX_TOKENS_CAP, MAX_TOKENS_CAP);
      const payload: Record<string, unknown> = {
        model: route.model,
        messages: request.messages,
        temperature: request.temperature ?? 0,
      };
      if (route.provider === "groq") {
        payload.max_completion_tokens = maxTokens;
        if (request.reasoningEffort && route.model.startsWith("openai/gpt-oss")) {
          payload.reasoning_effort = request.reasoningEffort;
          payload.include_reasoning = false;
        }
      } else {
        payload.max_tokens = maxTokens;
      }
      if (route.provider === "openrouter") {
        payload.usage = { include: true };
      }
      if (request.jsonSchema) {
        payload.response_format = {
          type: "json_schema",
          json_schema: {
            name: request.jsonSchema.name,
            strict: true,
            schema: request.jsonSchema.schema,
          },
        };
      }
      const json = JSON.stringify(payload);
      return {
        path: "/chat/completions",
        headers: { "Content-Type": "application/json" },
        body: () => json,
        keyParts: { kind: "chat", payload },
        summary: `chat ${route.model}, ${String(request.messages.length)} messages`,
        binary: false,
      };
    }
    case "stt": {
      const fields: Record<string, string> = {
        model: route.model,
        response_format: "verbose_json",
        temperature: "0",
      };
      if (request.language) {
        fields.language = request.language;
      }
      if (request.prompt) {
        fields.prompt = request.prompt;
      }
      return {
        path: "/audio/transcriptions",
        headers: {},
        body: () => {
          const form = new FormData();
          form.append("file", new Blob([request.audio], { type: "audio/wav" }), request.filename);
          for (const [k, v] of Object.entries(fields)) {
            form.append(k, v);
          }
          form.append("timestamp_granularities[]", "segment");
          return form;
        },
        keyParts: { kind: "stt", fields, audio: sha256(request.audio) },
        summary: `stt ${route.model}, ${request.durationSeconds.toFixed(1)} s`,
        binary: false,
      };
    }
    case "tts": {
      const payload = {
        model: route.model,
        voice: request.voice,
        input: request.text,
        response_format: "wav",
      };
      const json = JSON.stringify(payload);
      return {
        path: "/audio/speech",
        headers: { "Content-Type": "application/json" },
        body: () => json,
        keyParts: { kind: "tts", payload },
        summary: `tts ${route.model} ${request.voice}, ${String(request.text.length)} chars`,
        binary: true,
      };
    }
  }
}

function estimate(request: ModelRequest): { tokens?: number; audioSeconds?: number } {
  switch (request.kind) {
    case "chat": {
      const chars = request.messages.reduce((s, m) => s + m.content.length, 0);
      return {
        tokens:
          Math.ceil(chars / 4) + Math.min(request.maxTokens ?? MAX_TOKENS_CAP, MAX_TOKENS_CAP),
      };
    }
    case "stt":
      return { audioSeconds: Math.max(request.durationSeconds, 10) };
    case "tts":
      return { tokens: Math.ceil(request.text.length / 4) };
  }
}

interface Parsed {
  result: Record<string, unknown>;
  costUsd: number;
  usageRow: Partial<ModelCallRow>;
}

interface ChatCompletion {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number } | null;
    cost?: number;
  };
}

interface VerboseTranscription {
  text?: string;
  language?: string;
  duration?: number;
  segments?: {
    start: number;
    end: number;
    text: string;
    avg_logprob?: number;
    no_speech_prob?: number;
  }[];
}

function parseResult(
  request: ModelRequest,
  response: RecordedResponse,
  route: Route,
  price: Price | null,
): Parsed {
  switch (request.kind) {
    case "chat": {
      const body = response.json as ChatCompletion;
      const usage: Usage = {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        cachedTokens: body.usage?.prompt_tokens_details?.cached_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
      };
      const costUsd =
        price?.kind === "tokens"
          ? tokenCost(price, usage.inputTokens, usage.cachedTokens, usage.outputTokens)
          : (body.usage?.cost ?? 0);
      const choice = body.choices?.[0];
      return {
        result: {
          kind: "chat",
          content: choice?.message?.content ?? "",
          finishReason: choice?.finish_reason ?? "unknown",
          usage,
        },
        costUsd,
        usageRow: {
          inputTokens: usage.inputTokens,
          cachedTokens: usage.cachedTokens,
          outputTokens: usage.outputTokens,
        },
      };
    }
    case "stt": {
      const body = response.json as VerboseTranscription;
      const seconds = body.duration ?? request.durationSeconds;
      const costUsd = price?.kind === "audio" ? audioCost(price, seconds) : 0;
      return {
        result: {
          kind: "stt",
          text: body.text ?? "",
          language: body.language ?? null,
          durationSeconds: seconds,
          segments: (body.segments ?? []).map((s) => ({
            start: s.start,
            end: s.end,
            text: s.text.trim(),
            avgLogprob: s.avg_logprob ?? null,
            noSpeechProb: s.no_speech_prob ?? null,
          })),
        },
        costUsd,
        usageRow: { audioSeconds: Math.round(seconds * 100) / 100 },
      };
    }
    case "tts": {
      const costUsd = price?.kind === "chars" ? charCost(price, request.text.length) : 0;
      if (!response.base64) {
        throw new ProviderError(response.status, `${route.provider} returned no audio`);
      }
      return {
        result: { kind: "tts", audio: new Uint8Array(Buffer.from(response.base64, "base64")) },
        costUsd,
        usageRow: { characters: request.text.length },
      };
    }
  }
}
