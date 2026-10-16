import { SarvamAI, SarvamAIClient, SarvamAIError, SarvamAITimeoutError } from "sarvamai";

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

export type Provider = "groq" | "openrouter" | "gemini" | "sarvam";
export type ModelKind = "chat" | "stt" | "tts" | "translate";
export type GatewayMode = "live" | "replay" | "record";

export const PROVIDER_BASE_URLS: Record<Provider, string> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  sarvam: "https://api.sarvam.ai",
};

/**
 * Which kinds each provider can serve. Groq and Sarvam return segment
 * timestamps (ADR-0009); Sarvam serves Indian languages and translation (ADR-0014).
 */
const SUPPORTS: Record<Provider, readonly ModelKind[]> = {
  groq: ["chat", "stt", "tts"],
  openrouter: ["chat"],
  gemini: ["chat"],
  sarvam: ["stt", "tts", "translate"],
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
  routes: Routes;
  limits?: Record<string, ModelLimits>;
  timeoutMs?: number;
}

/** chat, stt and tts are required; regional STT and translation are only needed for regional calls. */
export interface Routes {
  chat: Route;
  stt: Route;
  tts: Route;
  /** Speech-to-text for Indian-language calls (SttRequest.regional). */
  sttRegional?: Route;
  /** Text-to-speech in Indian languages, for voicing regional seed calls (TtsRequest.regional). */
  ttsRegional?: Route;
  translate?: Route;
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
  /** Route to routes.sttRegional (Sarvam) instead of routes.stt; `language` is then a BCP-47 code or "unknown". */
  regional?: boolean;
  /** Words to recognise as written, such as product names (Sarvam keyterms; at most 50). */
  keyterms?: string[];
}

export interface TranslateRequest {
  kind: "translate";
  text: string;
  /** BCP-47 codes, e.g. "ta-IN" to "en-IN". */
  source: string;
  target: string;
}

export interface TtsRequest {
  kind: "tts";
  text: string;
  voice: string;
  /** Route to routes.ttsRegional (Sarvam Bulbul) instead of routes.tts; `language` is then a BCP-47 code. */
  regional?: boolean;
  language?: string;
}

export type ModelRequest = ChatRequest | SttRequest | TtsRequest | TranslateRequest;

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

/** One spoken word, in seconds from the start of the audio sent. */
export interface SttWord {
  text: string;
  start: number;
  end: number;
}

export interface SttResult {
  kind: "stt";
  text: string;
  language: string | null;
  durationSeconds: number;
  segments: SttSegment[];
  /** Every word of the audio, not grouped by segment; empty when the provider sends none. */
  words: SttWord[];
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

export interface TranslateResult {
  kind: "translate";
  text: string;
  costUsd: number;
  modelCallId: string;
  model: string;
}

type ResultFor<R extends ModelRequest> = R extends ChatRequest
  ? ChatResult
  : R extends SttRequest
    ? SttResult
    : R extends TranslateRequest
      ? TranslateResult
      : TtsResult;

export interface GatewayDeps {
  fetch?: typeof fetch;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface Gateway {
  callModel<R extends ModelRequest>(request: R, context: CallContext): Promise<ResultFor<R>>;
  routes: Routes;
}

/** routeFor picks the route a request goes to; regional STT and translation need their own. */
function routeFor(routes: Routes, request: ModelRequest): Route {
  if (request.kind === "stt" && request.regional) {
    if (!routes.sttRegional) {
      throw new ConfigurationError("no regional speech-to-text route; set STT_REGIONAL_MODEL");
    }
    return routes.sttRegional;
  }
  if (request.kind === "tts" && request.regional) {
    if (!routes.ttsRegional) {
      throw new ConfigurationError("no regional text-to-speech route");
    }
    return routes.ttsRegional;
  }
  if (request.kind === "translate") {
    if (!routes.translate) {
      throw new ConfigurationError("no translation route; set TRANSLATE_MODEL");
    }
    return routes.translate;
  }
  return routes[request.kind];
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
  const prices = new Map<string, Price | null>();
  const configured: [ModelKind, Route | undefined][] = [
    ["chat", config.routes.chat],
    ["stt", config.routes.stt],
    ["tts", config.routes.tts],
    ["stt", config.routes.sttRegional],
    ["tts", config.routes.ttsRegional],
    ["translate", config.routes.translate],
  ];
  for (const [kind, route] of configured) {
    if (!route) continue;
    if (!SUPPORTS[route.provider].includes(kind)) {
      throw new ConfigurationError(`${route.provider} cannot serve ${kind} calls`);
    }
    prices.set(`${route.provider}/${route.model}`, priceFor(route.provider, route.model));
  }

  async function callModel<R extends ModelRequest>(
    request: R,
    context: CallContext,
  ): Promise<ResultFor<R>> {
    const route = routeFor(config.routes, request);
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
      characters: request.kind === "tts" || request.kind === "translate" ? request.text.length : 0,
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
    const parsed = parseResult(
      request,
      response,
      route,
      prices.get(`${route.provider}/${route.model}`) ?? null,
    );
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
    const response = built.sdk
      ? await sendViaSdk(built.sdk, apiKey, route, built.binary)
      : await sendWithRetry(built, apiKey, route);
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

  /**
   * sendViaSdk runs a Sarvam SDK call on the gateway's own fetch, with the
   * SDK's retries off: the limiter, the 5xx retry and the error mapping stay
   * here, the same as for every other provider.
   */
  async function sendViaSdk(
    run: (client: SarvamAIClient) => Promise<unknown>,
    apiKey: string,
    route: Route,
    binary: boolean,
  ): Promise<RecordedResponse> {
    const client = new SarvamAIClient({
      apiSubscriptionKey: apiKey,
      fetch: doFetch,
      maxRetries: 0,
      timeoutInSeconds: timeoutMs / 1000,
    });
    for (let attempt = 0; ; attempt++) {
      try {
        const json = await run(client);
        if (binary) {
          // Bulbul answers with base64 audio in JSON; keep it as the audio itself, like Groq's.
          const audio = (json as SarvamAI.TextToSpeechResponse).audios[0] ?? "";
          return { status: 200, headers: { "content-type": "audio/wav" }, base64: audio };
        }
        return { status: 200, headers: { "content-type": "application/json" }, json };
      } catch (error) {
        if (error instanceof SarvamAITimeoutError) {
          throw new ProviderError(504, `${route.provider} timed out after ${String(timeoutMs)} ms`);
        }
        if (!(error instanceof SarvamAIError)) throw error;
        const status = error.statusCode ?? 0;
        if (status === 429) {
          const retryAfter = Number(error.rawResponse?.headers.get("retry-after") ?? "10");
          const waitMs = Math.max(1, Number.isFinite(retryAfter) ? retryAfter : 10) * 1000;
          limiter.block(route.model, waitMs);
          throw new RateLimitedError(waitMs, route.model);
        }
        if (status >= 500 && attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt] ?? 1000);
          continue;
        }
        throw new ProviderError(
          status,
          `${route.provider} ${String(status)}: ${JSON.stringify(error.body ?? error.message).slice(0, 300)}`,
        );
      }
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
  /** Set for providers called through their SDK (Sarvam); body and path are then unused. */
  sdk?: (client: SarvamAIClient) => Promise<unknown>;
}

const SARVAM_UNUSED = { path: "", headers: {}, body: () => "", binary: false } as const;

/** oneOf narrows a configured string to one of the SDK's enum values, or names what is wrong. */
function oneOf<T extends string>(values: Record<string, T>, value: string, what: string): T {
  const found = Object.values(values).find((v) => v === value);
  if (found === undefined) {
    throw new ConfigurationError(`sarvam does not support ${what} "${value}"`);
  }
  return found;
}

/** buildSarvam describes a Sarvam call: the SDK call to make and the cassette key that stands for it. */
function buildSarvam(
  request: SttRequest | TranslateRequest | TtsRequest,
  route: Route,
): BuiltRequest {
  if (request.kind === "tts") {
    const fields = {
      text: request.text,
      language_code: request.language ?? "en-IN",
      speaker: request.voice,
      model: route.model,
    };
    return {
      ...SARVAM_UNUSED,
      binary: true,
      keyParts: { kind: "tts", fields },
      summary: `tts ${route.model} ${fields.speaker} ${fields.language_code}, ${String(request.text.length)} chars`,
      sdk: async (client) => {
        const res = await client.textToSpeech.convert({
          text: fields.text,
          language_code: oneOf(SarvamAI.TextToSpeechLanguage, fields.language_code, "language"),
          speaker: oneOf(SarvamAI.TextToSpeechSpeaker, fields.speaker, "speaker"),
          model: oneOf(SarvamAI.TextToSpeechModel, fields.model, "text-to-speech model"),
          speech_sample_rate: 24_000,
          output_audio_codec: "wav",
        });
        return res;
      },
    };
  }
  if (request.kind === "translate") {
    const fields = {
      input: request.text,
      source_language_code: request.source,
      target_language_code: request.target,
      model: route.model,
    };
    return {
      ...SARVAM_UNUSED,
      keyParts: { kind: "translate", fields },
      summary: `translate ${route.model} ${request.source} to ${request.target}, ${String(request.text.length)} chars`,
      sdk: (client) =>
        client.text.translate({
          input: fields.input,
          source_language_code: oneOf(
            SarvamAI.TranslateSourceLanguage,
            fields.source_language_code,
            "source language",
          ),
          target_language_code: oneOf(
            SarvamAI.TranslateTargetLanguage,
            fields.target_language_code,
            "target language",
          ),
          model: oneOf(SarvamAI.TranslateModel, fields.model, "translation model"),
        }),
    };
  }
  const fields = {
    model: route.model,
    language_code: request.language ?? "unknown",
    keyterms: (request.keyterms ?? []).slice(0, 50),
  };
  return {
    ...SARVAM_UNUSED,
    keyParts: { kind: "stt", fields, audio: sha256(request.audio) },
    summary: `stt ${route.model} ${fields.language_code}, ${request.durationSeconds.toFixed(1)} s`,
    sdk: (client) =>
      client.speechToText.transcribe({
        file: { data: request.audio, filename: request.filename },
        model: oneOf(SarvamAI.SpeechToTextModel, fields.model, "speech-to-text model"),
        language_code: oneOf(SarvamAI.SpeechToTextLanguage, fields.language_code, "language"),
        with_timestamps: true,
        ...(fields.keyterms.length > 0 ? { keyterms: fields.keyterms } : {}),
      }),
  };
}

function buildRequest(request: ModelRequest, route: Route): BuiltRequest {
  if (route.provider === "sarvam") {
    if (request.kind === "chat") {
      throw new ConfigurationError("sarvam cannot serve chat calls");
    }
    return buildSarvam(request, route);
  }
  if (request.kind === "translate") {
    throw new ConfigurationError(`${route.provider} cannot serve translate calls`);
  }
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
          for (const g of STT_GRANULARITIES) {
            form.append("timestamp_granularities[]", g);
          }
          return form;
        },
        // The granularities are in the key: a cached reply without words is never reused for one with them.
        keyParts: {
          kind: "stt",
          fields,
          granularities: STT_GRANULARITIES,
          audio: sha256(request.audio),
        },
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

/** Segment times for the transcript lines, word times for the read-along highlight. */
const STT_GRANULARITIES = ["segment", "word"] as const;

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
    case "translate":
      // Sarvam is limited by requests per minute; the request itself is the unit.
      return {};
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
  words?: { word: string; start: number; end: number }[];
}

/** parseSarvamStt maps Sarvam's chunk timestamps (in `timestamps.words`, one entry per chunk) to segments. */
function parseSarvamStt(request: SttRequest, response: RecordedResponse): Parsed["result"] {
  const body = response.json as SarvamAI.SpeechToTextResponse;
  const ts = body.timestamps;
  const segments = ts
    ? ts.words.map((text, i) => ({
        start: ts.start_time_seconds[i] ?? 0,
        end: ts.end_time_seconds[i] ?? ts.start_time_seconds[i] ?? 0,
        text: text.trim(),
        avgLogprob: null,
        noSpeechProb: null,
      }))
    : [
        {
          start: 0,
          end: request.durationSeconds,
          text: body.transcript.trim(),
          avgLogprob: null,
          noSpeechProb: null,
        },
      ];
  return {
    kind: "stt",
    text: body.transcript,
    language: body.language_code ?? request.language ?? null,
    durationSeconds: request.durationSeconds,
    segments: segments.filter((seg) => seg.text),
    // Sarvam returns chunk-level timestamps only: the transcript reads along line by line.
    words: [],
  };
}

function parseResult(
  request: ModelRequest,
  response: RecordedResponse,
  route: Route,
  price: Price | null,
): Parsed {
  if (request.kind === "translate") {
    const body = response.json as SarvamAI.TranslationResponse;
    return {
      result: { kind: "translate", text: body.translated_text },
      costUsd: price?.kind === "chars" ? charCost(price, request.text.length) : 0,
      usageRow: { characters: request.text.length },
    };
  }
  if (request.kind === "stt" && route.provider === "sarvam") {
    const seconds = request.durationSeconds;
    return {
      result: parseSarvamStt(request, response),
      costUsd: price?.kind === "audio" ? audioCost(price, seconds) : 0,
      usageRow: { audioSeconds: Math.round(seconds * 100) / 100 },
    };
  }
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
          words: (body.words ?? [])
            .map((w) => ({ text: w.word.trim(), start: w.start, end: w.end }))
            .filter((w) => w.text),
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
