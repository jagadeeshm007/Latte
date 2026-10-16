import { describe, expect, it, vi } from "vitest";

import { LatteClient } from "./client.ts";
import { ApiError, RateLimitError } from "./errors.ts";

const KEY = `latte_abcd1234_${"x".repeat(43)}`;
const BASE = "https://api.test";

interface Sent {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/** A fetch that answers from a queue of responses and records what was sent. */
function fakeFetch(answers: (Response | Error | ((s: Sent) => Response))[]) {
  const sent: Sent[] = [];
  const fn = vi.fn((input: string | URL | Request, init: RequestInit = {}) => {
    const s: Sent = {
      method: init.method ?? "GET",
      url: input instanceof Request ? input.url : input.toString(),
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof init.body === "string" ? JSON.parse(init.body) : init.body,
    };
    sent.push(s);
    const next = answers.shift();
    if (!next) return Promise.reject(new Error("no more answers"));
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(typeof next === "function" ? next(s) : next);
  });
  return { fetch: fn as unknown as typeof fetch, sent };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
const me = { id: "u1", email: "m@test", displayName: "Mira", role: "manager", agentId: null };
const apiError = (status: number, code: string, message: string, headers = {}) =>
  json({ error: { code, message, requestId: "req-1" } }, status, headers);

function client(answers: Parameters<typeof fakeFetch>[0], maxRetries = 3) {
  const f = fakeFetch(answers);
  const waits: number[] = [];
  const latte = new LatteClient({
    apiKey: KEY,
    baseUrl: `${BASE}/`,
    fetch: f.fetch,
    maxRetries,
    sleep: (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
  });
  return { latte, sent: f.sent, waits };
}

describe("LatteClient", () => {
  it("refuses anything but a Latte API key", () => {
    expect(() => new LatteClient({ apiKey: "sk_live_x", baseUrl: BASE })).toThrow(/latte_/);
  });

  it("sends the key, a request id and the query, and validates the reply", async () => {
    const { latte, sent } = client([json({ items: [], nextCursor: null, total: 0 })]);

    const list = await latte.calls.list({ status: "failed", limit: 10, q: "" });

    expect(list.total).toBe(0);
    expect(sent[0]!.url).toBe(`${BASE}/api/calls?status=failed&limit=10`);
    expect(sent[0]!.headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(sent[0]!.headers["X-Request-Id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent[0]!.headers["User-Agent"]).toBe("latte-sdk/0.1.0");
  });

  it("waits out a 429 for as long as Retry-After says, then succeeds", async () => {
    const { latte, waits } = client([
      apiError(429, "rate_limited", "over the read limit", { "Retry-After": "7" }),
      json(me),
    ]);

    expect((await latte.me()).displayName).toBe("Mira");
    expect(waits).toEqual([7000]);
  });

  it("gives up after its retries with a RateLimitError naming the wait", async () => {
    const limited = () => apiError(429, "rate_limited", "over", { "Retry-After": "3" });
    const { latte } = client([limited(), limited()], 1);

    const error = await latte.me().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error).toMatchObject({ status: 429, retryAfterSeconds: 3, requestId: "req-1" });
  });

  it("retries a read after a server error or a dropped connection, never a write", async () => {
    const read = client([new Error("socket hang up"), apiError(503, "down", "busy"), json(me)]);
    const write = client([apiError(500, "boom", "it broke")]);

    await read.latte.me();
    const error = await write.latte.calls.retry("c1").catch((e: unknown) => e);

    expect(read.waits).toEqual([500, 1000]);
    expect(error).toMatchObject({ status: 500, code: "boom", message: "it broke" });
    expect(write.sent).toHaveLength(1);
  });

  it("names a response that does not match the API's schema", async () => {
    const { latte } = client([json({ id: 1 })]);

    const error = await latte.me().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "invalid_response" });
  });

  it("uploads one file: sign, PUT straight to storage without the key, then confirm", async () => {
    const { latte, sent } = client([
      json({ uploads: [{ path: "u/1.wav", signedUrl: "https://storage.test/put/1", token: "t" }] }),
      new Response(null, { status: 200 }),
      json({ batchId: "b1", callIds: ["c1"] }, 201),
    ]);

    const result = await latte.calls.upload(
      {
        data: new Uint8Array(12),
        filename: "call.mp3",
        agentId: "a",
        teamId: "t",
        productId: "p",
        callDate: "2026-10-01",
      },
      { batchName: "CRM" },
    );

    expect(result).toEqual({ batchId: "b1", callId: "c1" });
    expect(sent.map((s) => [s.method, s.url])).toEqual([
      ["POST", `${BASE}/api/uploads/sign`],
      ["PUT", "https://storage.test/put/1"],
      ["POST", `${BASE}/api/uploads/confirm`],
    ]);
    expect(sent[1]!.headers).toEqual({ "Content-Type": "audio/mpeg" });
    expect(sent[2]!.body).toMatchObject({
      batchName: "CRM",
      files: [{ path: "u/1.wav", mimeType: "audio/mpeg", sizeBytes: 12 }],
    });
  });

  it("uploads a batch in chunks: the first names it, the rest join it, a failure is reported", async () => {
    let confirms = 0;
    const answer = (s: Sent): Response => {
      if (s.method === "PUT") return new Response(null, { status: 200 });
      const body = s.body as { files: { name?: string; path?: string }[]; batchId?: string };
      if (s.url.endsWith("/sign")) {
        return json({
          uploads: body.files.map((f) => ({
            path: `u/${f.name ?? ""}`,
            signedUrl: "https://s/x",
            token: "t",
          })),
        });
      }
      confirms++;
      if (confirms === 2) return apiError(409, "conflict", "batch is archived");
      return json({ batchId: "b1", callIds: body.files.map((f) => f.path ?? "") }, 201);
    };
    const files = Array.from({ length: 5 }, (_, i) => ({
      data: new Uint8Array(4),
      filename: `f${String(i)}.wav`,
      agentId: "a",
      teamId: "t",
      productId: "p",
      callDate: "2026-10-01",
    }));
    const { latte, sent } = client(Array.from({ length: 30 }, () => answer));
    const progress: number[] = [];

    const result = await latte.batches.create(files, {
      name: "Week 42",
      chunkSize: 2,
      concurrency: 1,
      onProgress: (done) => progress.push(done),
    });

    const confirmBodies = sent
      .filter((s) => s.url.endsWith("/confirm"))
      .map((s) => s.body as { batchName?: string; batchId?: string });
    expect(confirmBodies.map((b) => [b.batchName, b.batchId])).toEqual([
      ["Week 42", undefined],
      [undefined, "b1"],
      [undefined, "b1"],
    ]);
    expect(result.callIds).toEqual(["u/f0.wav", "u/f1.wav", "u/f4.wav"]);
    expect(result.failed).toEqual([
      { filename: "f2.wav", error: "batch is archived" },
      { filename: "f3.wav", error: "batch is archived" },
    ]);
    expect(progress).toEqual([2, 4, 5]);
  });

  it("tries nothing more when the first chunk cannot make the batch", async () => {
    const { latte } = client([apiError(403, "insufficient_scope", "needs calls:write")]);

    const result = await latte.batches.create(
      [1, 2, 3].map((i) => ({
        data: new Uint8Array(1),
        filename: `f${String(i)}.wav`,
        agentId: "a",
        teamId: "t",
        productId: "p",
        callDate: "2026-10-01",
      })),
      { chunkSize: 1 },
    );

    expect(result.batchId).toBeNull();
    expect(result.failed.map((f) => f.error)).toEqual([
      "needs calls:write",
      "not tried: no batch",
      "not tried: no batch",
    ]);
  });

  it("maps every method to its route and method", async () => {
    const notFound = () => apiError(404, "not_found", "not found");
    const { latte, sent } = client([
      json({ agents: [], teams: [], products: [] }),
      notFound(),
      json({ url: "https://s/a.wav", expiresInSeconds: 600 }),
      new Response(null, { status: 204 }),
      new Response(null, { status: 204 }),
      json({ items: [], total: 0 }),
      notFound(),
      notFound(),
      json({ queued: 2 }, 202),
      notFound(),
      notFound(),
      notFound(),
    ]);
    const settle = (p: Promise<unknown>) => p.catch((e: unknown) => e);

    await latte.reference();
    await settle(latte.calls.get("c1"));
    await latte.calls.audioUrl("c1", true);
    await latte.calls.archive("c1");
    await latte.calls.unarchive("c1");
    await latte.batches.list({ state: "processing" });
    await settle(latte.batches.get("b1"));
    await settle(latte.batches.update("b1", { name: "New" }));
    await latte.batches.retryFailed("b1");
    await settle(latte.analytics.dashboard({ groupBy: "team" }));
    await settle(latte.analytics.highlights({ from: "2026-10-01" }));
    await settle(latte.analytics.leaderboard({ sort: "breaches" }));

    expect(sent.map((s) => `${s.method} ${s.url.replace(BASE, "")}`)).toEqual([
      "GET /api/reference",
      "GET /api/calls/c1",
      "POST /api/calls/c1/audio-url",
      "POST /api/calls/c1/archive",
      "POST /api/calls/c1/unarchive",
      "GET /api/batches?state=processing",
      "GET /api/batches/b1",
      "PATCH /api/batches/b1",
      "POST /api/batches/b1/retry-failed",
      "GET /api/dashboard?groupBy=team",
      "GET /api/dashboard/highlights?from=2026-10-01",
      "GET /api/dashboard/leaderboard?sort=breaches",
    ]);
    expect(sent[2]!.body).toEqual({ download: true });
  });

  it("reads an error that is not JSON, and a Retry-After it cannot use, safely", async () => {
    const plain = client([new Response("Bad gateway", { status: 502 })], 0);
    const odd = client(
      [new Response("{}", { status: 429, headers: { "Retry-After": "soon" } })],
      0,
    );
    const write = client([new Error("ECONNRESET")]);

    const [a, b, c] = await Promise.all([
      plain.latte.me().catch((e: unknown) => e),
      odd.latte.me().catch((e: unknown) => e),
      write.latte.calls.retry("c1").catch((e: unknown) => e),
    ]);

    expect(a).toMatchObject({ status: 502, code: "http", message: "HTTP 502" });
    expect(b).toMatchObject({ retryAfterSeconds: 1 });
    expect(c).toMatchObject({ status: 0, code: "network" });
    expect(write.sent).toHaveLength(1);
  });

  it("names a storage upload that failed, and sends a Blob's size", async () => {
    const { latte, sent } = client([
      json({ uploads: [{ path: "u/1.wav", signedUrl: "https://s/1", token: "t" }] }),
      new Response(null, { status: 403 }),
    ]);

    const error = await latte.calls
      .upload({
        data: new Blob([new Uint8Array(9)]),
        filename: "a.wav",
        agentId: "a",
        teamId: "t",
        productId: "p",
        callDate: "2026-10-01",
      })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ code: "upload_failed", status: 403 });
    expect(sent[0]!.body).toEqual({ files: [{ name: "a.wav", type: "audio/wav", size: 9 }] });
  });

  it("stops waiting for a batch at its timeout", async () => {
    const processing = {
      id: "b1",
      name: "B",
      source: "api",
      createdBy: "u1",
      createdByName: "Mira",
      createdAt: "2026-10-01T00:00:00.000Z",
      archivedAt: null,
      total: 1,
      queued: 1,
      processing: 0,
      scored: 0,
      failed: 0,
      flagged: 0,
      avgScore: null,
      state: "processing",
      breaches: 0,
      audioMs: 0,
      costUsd: 0,
      lastActivityAt: null,
    };
    const { latte } = client([json(processing)]);

    const error = await latte.batches.wait("b1", { timeoutMs: -1 }).catch((e: unknown) => e);

    expect(error).toMatchObject({ code: "timeout" });
  });

  it("waits for a batch to finish, and reads its CSV and ZIP", async () => {
    const batch = (state: string) => ({
      id: "b1",
      name: "B",
      source: "api",
      createdBy: "u1",
      createdByName: "Mira",
      createdAt: "2026-10-01T00:00:00.000Z",
      archivedAt: null,
      total: 1,
      queued: 0,
      processing: state === "processing" ? 1 : 0,
      scored: state === "processing" ? 0 : 1,
      failed: 0,
      flagged: 0,
      avgScore: null,
      state,
      breaches: 0,
      audioMs: 0,
      costUsd: 0,
      lastActivityAt: null,
    });
    const { latte, sent, waits } = client([
      json(batch("processing")),
      json(batch("completed")),
      new Response("call_id,file\r\n", { status: 200 }),
      new Response(new Uint8Array([80, 75]), { status: 200 }),
    ]);

    const done = await latte.batches.wait("b1", { intervalMs: 10 });
    const csv = await latte.batches.resultsCsv("b1");
    const zip = await latte.batches.exportZip("b1", ["audio", "transcripts"]);

    expect(done.state).toBe("completed");
    expect(waits).toEqual([10]);
    expect(csv).toBe("call_id,file\r\n");
    expect(zip).toBeInstanceOf(ReadableStream);
    expect(sent.at(-1)!.url).toBe(`${BASE}/api/batches/b1/export.zip?include=audio%2Ctranscripts`);
  });
});
