import { ApiError, RateLimitError } from "./errors.ts";
import { parseTranscript, type ParseOptions } from "./transcript.ts";
import type {
  AudioUrl,
  BatchDetail,
  BatchExportPart,
  BatchList,
  BatchListQuery,
  BatchRetryResponse,
  BatchUpdateRequest,
  CallDetail,
  CallList,
  CallListQuery,
  CreatedWebhook,
  CreateWebhookRequest,
  Dashboard,
  DashboardQuery,
  Highlights,
  HighlightsQuery,
  Language,
  Leaderboard,
  LeaderboardQuery,
  Me,
  Reference,
  TranscriptLine,
  TranscriptUploadRequest,
  UpdateWebhookRequest,
  UploadConfirmResponse,
  UploadSignResponse,
  WebhookDeliveryList,
  WebhookDeliveryQuery,
  WebhookEndpoint,
  WebhookEndpointList,
} from "./types.ts";

// LatteClient: the Latte API for machine clients, with an API key. It retries
// what is safe to retry (rate limits, and server errors on reads), honours
// Retry-After, and uploads batches in chunks the way the web app does. It has
// no dependencies: fetch and Web Crypto only, so it runs on Node 18+, Bun,
// Deno, edge runtimes and browsers. Response types are generated from the
// API's own schemas (scripts/gen-types.ts).

export const SDK_VERSION = "0.1.0";

export interface LatteClientOptions {
  /** latte_<prefix>_<secret>, from Developers in the app. */
  apiKey: string;
  /** The API's origin, e.g. https://api.latte.example */
  baseUrl: string;
  fetch?: typeof fetch;
  /** Retries after a 429 or a server error on a read; 0 turns retrying off. */
  maxRetries?: number;
  /** Per request; uploads of large files may need more. */
  timeoutMs?: number;
  /** For tests: how to wait between retries. */
  sleep?: (ms: number) => Promise<void>;
}

/** Any of the query types; only string, number and boolean values are sent. */
type Query = object;

interface RequestOptions {
  query?: Query | undefined;
  body?: unknown;
  /** Sent as Idempotency-Key; a write with one may be retried safely (ADR-0022). */
  idempotencyKey?: string | undefined;
}

/** Options for a create call. */
export interface WriteOptions {
  /** The same key replays the first response for 24 hours instead of creating twice. */
  idempotencyKey?: string;
}

/**
 * One call uploaded as a transcript, with no audio (ADR-0030). Give the lines,
 * or the text a dialler exported (labelled "Agent:"/"Customer:" or JSON),
 * which is read with parseTranscript.
 */
export type TranscriptInput = Omit<TranscriptUploadRequest["transcripts"][number], "lines"> & {
  /** Speaker labels beyond Agent/Customer, for text. */
  speakers?: ParseOptions["speakers"];
} & ({ lines: TranscriptLine[]; text?: never } | { text: string; lines?: never });

/** One recording to upload, with what it is about. */
export interface UploadFile {
  data: Blob | Uint8Array;
  filename: string;
  /** audio/wav or audio/mpeg; taken from the file name when left out. */
  mimeType?: "audio/wav" | "audio/mpeg";
  agentId: string;
  teamId: string;
  productId: string;
  /** YYYY-MM-DD */
  callDate: string;
  language?: Language;
}

export interface BatchUploadResult {
  batchId: string | null;
  callIds: string[];
  failed: { filename: string; error: string }[];
}

/** The API's error body; details carries what a 429 or a validation error adds. */
interface Envelope {
  error: { code: string; message: string; requestId?: string; details?: unknown };
}

function envelopeOf(text: string): Envelope | null {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || !("error" in value)) return null;
    const error: unknown = value.error;
    if (typeof error !== "object" || error === null) return null;
    const { code, message, requestId, details } = error as Record<string, unknown>;
    if (typeof code !== "string" || typeof message !== "string") return null;
    return {
      error: {
        code,
        message,
        ...(typeof requestId === "string" ? { requestId } : {}),
        ...(details === undefined ? {} : { details }),
      },
    };
  } catch {
    return null;
  }
}

/** Hex SHA-256 through Web Crypto, available on every runtime the SDK supports. */
async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
const MAX_BACKOFF_MS = 30_000;

const mimeOf = (f: UploadFile) =>
  f.mimeType ?? (f.filename.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/wav");
const sizeOf = (data: Blob | Uint8Array) => (data instanceof Blob ? data.size : data.byteLength);

export class LatteClient {
  private readonly fetch: typeof fetch;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: LatteClientOptions) {
    if (!options.apiKey.startsWith("latte_")) {
      throw new Error("apiKey must be a Latte API key (latte_…); create one under Developers");
    }
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.maxRetries = options.maxRetries ?? 3;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.sleep =
      options.sleep ??
      ((ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        }));
  }

  /** The manager the key acts as. */
  me() {
    return this.request<Me>("GET", "/api/me");
  }

  /** Agents, teams and products to upload against. */
  reference() {
    return this.request<Reference>("GET", "/api/reference");
  }

  readonly calls = {
    list: (query: CallListQuery = {}) => this.request<CallList>("GET", "/api/calls", { query }),
    get: (id: string) => this.request<CallDetail>("GET", `/api/calls/${id}`),
    audioUrl: (id: string, download = false) =>
      this.request<AudioUrl>("POST", `/api/calls/${id}/audio-url`, { body: { download } }),
    retry: (id: string) => this.request<{ status: string }>("POST", `/api/calls/${id}/retry`),
    archive: (id: string) => this.request<undefined>("POST", `/api/calls/${id}/archive`),
    unarchive: (id: string) => this.request<undefined>("POST", `/api/calls/${id}/unarchive`),
    /** Uploads one recording into a new batch (or batchId) and returns its call id. */
    upload: async (file: UploadFile, batch: { batchId?: string; batchName?: string } = {}) => {
      const result = await this.uploadChunk([file], batch);
      return { batchId: result.batchId, callId: result.callIds[0] ?? "" };
    },
    /** Creates one call from a transcript, with no audio, in a new batch (or batchId). */
    uploadTranscript: async (
      transcript: TranscriptInput,
      batch: { batchId?: string; batchName?: string } = {},
    ) => {
      const result = await this.sendTranscripts([transcript], batch);
      return { batchId: result.batchId, callId: result.callIds[0] ?? "" };
    },
  };

  readonly batches = {
    list: (query: BatchListQuery = {}) => this.request<BatchList>("GET", "/api/batches", { query }),
    get: (id: string) => this.request<BatchDetail>("GET", `/api/batches/${id}`),
    update: (id: string, patch: BatchUpdateRequest) =>
      this.request<BatchDetail>("PATCH", `/api/batches/${id}`, { body: patch }),
    retryFailed: (id: string, opts: WriteOptions = {}) =>
      this.request<BatchRetryResponse>("POST", `/api/batches/${id}/retry-failed`, {
        idempotencyKey: opts.idempotencyKey,
      }),
    /**
     * Uploads many recordings as one batch: chunks of chunkSize files, the
     * first creating the batch, then `concurrency` chunks at a time. A failed
     * chunk does not stop the rest; its files come back in `failed`.
     */
    create: (
      files: UploadFile[],
      opts: {
        name?: string;
        chunkSize?: number;
        concurrency?: number;
        onProgress?: (done: number, total: number) => void;
      } = {},
    ) =>
      this.createBatch(
        files,
        opts,
        (chunk, batch) => this.uploadChunk(chunk, batch),
        (f) => f.filename,
      ),
    /** Like create, for transcripts with no audio: chunks of up to 50, one batch. */
    createFromTranscripts: (
      transcripts: TranscriptInput[],
      opts: {
        name?: string;
        chunkSize?: number;
        concurrency?: number;
        onProgress?: (done: number, total: number) => void;
      } = {},
    ) =>
      this.createBatch(
        transcripts,
        opts,
        (chunk, batch) => this.sendTranscripts(chunk, batch),
        (t) => t.originalFilename,
      ),
    /** Polls until no call in the batch is queued or running, then returns it. */
    wait: async (
      id: string,
      opts: { intervalMs?: number; timeoutMs?: number } = {},
    ): Promise<BatchDetail> => {
      const deadline = Date.now() + (opts.timeoutMs ?? 30 * 60_000);
      for (;;) {
        const batch = await this.batches.get(id);
        if (batch.state !== "processing") return batch;
        if (Date.now() > deadline) {
          throw new ApiError("the batch is still processing", 408, "timeout", null);
        }
        await this.sleep(opts.intervalMs ?? 5000);
      }
    },
    /** The results as CSV text: one row per call, one column per rubric item. */
    resultsCsv: async (id: string) =>
      (await this.raw("GET", `/api/batches/${id}/results.csv`)).text(),
    /** A ZIP of results, transcripts and, when asked, recordings, as a stream to save. */
    exportZip: async (id: string, include: BatchExportPart[] = ["transcripts"]) => {
      const res = await this.raw("GET", `/api/batches/${id}/export.zip`, {
        query: { include: include.join(",") },
      });
      if (!res.body) throw new ApiError("the export came back empty", res.status, "empty", null);
      return res.body;
    },
  };

  readonly webhooks = {
    list: () => this.request<WebhookEndpointList>("GET", "/api/webhooks"),
    get: (id: string) => this.request<WebhookEndpoint>("GET", `/api/webhooks/${id}`),
    /** Registers an endpoint; keep the returned secret to check signatures. */
    create: (body: CreateWebhookRequest, opts: WriteOptions = {}) =>
      this.request<CreatedWebhook>("POST", "/api/webhooks", {
        body,
        idempotencyKey: opts.idempotencyKey,
      }),
    update: (id: string, patch: UpdateWebhookRequest) =>
      this.request<WebhookEndpoint>("PATCH", `/api/webhooks/${id}`, { body: patch }),
    delete: (id: string) => this.request<undefined>("DELETE", `/api/webhooks/${id}`),
    /** Sends a ping event to the endpoint. */
    test: (id: string) => this.request<{ queued: number }>("POST", `/api/webhooks/${id}/test`),
    deliveries: (id: string, query: WebhookDeliveryQuery = {}) =>
      this.request<WebhookDeliveryList>("GET", `/api/webhooks/${id}/deliveries`, { query }),
    redeliver: (id: string, deliveryId: string) =>
      this.request<{ queued: number }>(
        "POST",
        `/api/webhooks/${id}/deliveries/${deliveryId}/redeliver`,
      ),
  };

  readonly analytics = {
    dashboard: (query: DashboardQuery = {}) =>
      this.request<Dashboard>("GET", "/api/dashboard", { query }),
    highlights: (query: HighlightsQuery = {}) =>
      this.request<Highlights>("GET", "/api/dashboard/highlights", { query }),
    leaderboard: (query: LeaderboardQuery = {}) =>
      this.request<Leaderboard>("GET", "/api/dashboard/leaderboard", { query }),
  };

  private async createBatch<T>(
    files: T[],
    opts: {
      name?: string;
      chunkSize?: number;
      concurrency?: number;
      onProgress?: (done: number, total: number) => void;
    },
    send: (
      chunk: T[],
      batch: { batchId?: string; batchName?: string },
    ) => Promise<UploadConfirmResponse>,
    nameOf: (item: T) => string,
  ): Promise<BatchUploadResult> {
    const size = Math.min(50, Math.max(1, opts.chunkSize ?? 10));
    const chunks: T[][] = [];
    for (let at = 0; at < files.length; at += size) chunks.push(files.slice(at, at + size));
    const out: BatchUploadResult = { batchId: null, callIds: [], failed: [] };
    let done = 0;

    const run = async (chunk: T[]) => {
      try {
        const result = await send(
          chunk,
          out.batchId ? { batchId: out.batchId } : opts.name ? { batchName: opts.name } : {},
        );
        out.batchId = result.batchId;
        out.callIds.push(...result.callIds);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        out.failed.push(...chunk.map((f) => ({ filename: nameOf(f), error: message })));
      }
      done += chunk.length;
      opts.onProgress?.(done, files.length);
    };

    // The first chunk makes the batch the others join; without it nothing else is tried.
    const first = chunks.shift();
    if (first) await run(first);
    if (!out.batchId) {
      out.failed.push(
        ...chunks.flat().map((f) => ({ filename: nameOf(f), error: "not tried: no batch" })),
      );
      return out;
    }
    let next = 0;
    const worker = async () => {
      for (let chunk = chunks[next++]; chunk; chunk = chunks[next++]) await run(chunk);
    };
    await Promise.all(
      Array.from({ length: Math.min(opts.concurrency ?? 3, chunks.length) }, worker),
    );
    return out;
  }

  /** Sends transcripts in one request, reading any given as text first. */
  private async sendTranscripts(
    transcripts: TranscriptInput[],
    batch: { batchId?: string; batchName?: string },
  ): Promise<UploadConfirmResponse> {
    const body: TranscriptUploadRequest = {
      ...batch,
      transcripts: transcripts.map(({ text, lines, speakers, ...meta }) => ({
        ...meta,
        lines: lines ?? parseTranscript(text, speakers ? { speakers } : {}),
      })),
    };
    // Keyed by the content, so a retried request never creates the calls twice.
    const idempotencyKey = `transcripts-${(await sha256Hex(JSON.stringify(body))).slice(0, 40)}`;
    return this.request<UploadConfirmResponse>("POST", "/api/uploads/transcripts", {
      body,
      idempotencyKey,
    });
  }

  /** sign, PUT each file straight to storage, then confirm the chunk into a batch. */
  private async uploadChunk(files: UploadFile[], batch: { batchId?: string; batchName?: string }) {
    const signed = await this.request<UploadSignResponse>("POST", "/api/uploads/sign", {
      body: {
        files: files.map((f) => ({ name: f.filename, type: mimeOf(f), size: sizeOf(f.data) })),
      },
    });
    await Promise.all(
      files.map(async (f, i) => {
        const target = signed.uploads[i];
        if (!target) throw new ApiError("the server did not sign every file", 500, "sign", null);
        // Storage, not the Latte API: the signed URL is the permission, so no API key goes with it.
        const res = await this.fetch(target.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": mimeOf(f) },
          body: f.data,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) {
          throw new ApiError(
            `uploading ${f.filename} failed (${String(res.status)})`,
            res.status,
            "upload_failed",
            null,
          );
        }
      }),
    );
    // Keyed by the signed paths, so a retried confirm never creates the calls twice.
    const idempotencyKey = `confirm-${(await sha256Hex(signed.uploads.map((u) => u.path).join("|"))).slice(0, 40)}`;
    return this.request<UploadConfirmResponse>("POST", "/api/uploads/confirm", {
      idempotencyKey,
      body: {
        ...batch,
        files: files.map((f, i) => ({
          path: signed.uploads[i]?.path ?? "",
          originalFilename: f.filename,
          mimeType: mimeOf(f),
          sizeBytes: sizeOf(f.data),
          agentId: f.agentId,
          teamId: f.teamId,
          productId: f.productId,
          callDate: f.callDate,
          ...(f.language ? { language: f.language } : {}),
        })),
      },
    });
  }

  /** request sends and returns the JSON reply, typed as the API documents it. */
  private async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const res = await this.raw(method, path, opts);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** raw sends with retries and returns the successful response, or throws the API's error. */
  private async raw(method: string, path: string, opts: RequestOptions = {}): Promise<Response> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries((opts.query ?? {}) as Record<string, unknown>)) {
      if ((typeof v === "string" && v !== "") || typeof v === "number" || typeof v === "boolean") {
        url.searchParams.set(k, String(v));
      }
    }
    const requestId = crypto.randomUUID();
    // A read, or a write with an idempotency key, can be sent again without doing it twice.
    const safe = method === "GET" || opts.idempotencyKey !== undefined;
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.options.apiKey}`,
            Accept: "application/json",
            "X-Request-Id": requestId,
            "User-Agent": `latte-sdk/${SDK_VERSION}`,
            ...(opts.body === undefined ? {} : { "Content-Type": "application/json" }),
            ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
          },
          ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (cause) {
        if (safe && attempt < this.maxRetries) {
          await this.sleep(this.backoff(attempt));
          continue;
        }
        throw new ApiError(
          `${method} ${path}: ${cause instanceof Error ? cause.message : "network error"}`,
          0,
          "network",
          requestId,
        );
      }
      if (res.ok) return res;
      const error = await this.errorOf(res, requestId);
      // 429 is refused before any work, so any method may retry; a 5xx only when safe.
      const retryable = error instanceof RateLimitError || (res.status >= 500 && safe);
      if (!retryable || attempt >= this.maxRetries) throw error;
      await this.sleep(
        error instanceof RateLimitError ? error.retryAfterSeconds * 1000 : this.backoff(attempt),
      );
    }
  }

  private backoff(attempt: number): number {
    return Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt);
  }

  private async errorOf(res: Response, requestId: string): Promise<ApiError> {
    const envelope = envelopeOf(await res.text());
    const message = envelope?.error.message ?? `HTTP ${String(res.status)}`;
    const id = envelope?.error.requestId ?? res.headers.get("x-request-id") ?? requestId;
    if (res.status === 429) {
      const after = Number(res.headers.get("retry-after") ?? "1");
      return new RateLimitError(
        message,
        id,
        Number.isFinite(after) && after > 0 ? after : 1,
        envelope?.error.details,
      );
    }
    return new ApiError(
      message,
      res.status,
      envelope?.error.code ?? "http",
      id,
      envelope?.error.details,
    );
  }
}
