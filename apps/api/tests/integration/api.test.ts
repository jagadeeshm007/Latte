import { readFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_RUBRIC } from "@scc/shared";
import { unzipSync } from "fflate";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fakeGateway,
  type Fixture,
  log,
  recordingQueue,
  resetData,
  seedFixture,
  testApp,
  testPool,
} from "./helpers.ts";
import { encodeWav } from "../../src/audio/wav.ts";
import type { Client, Pool } from "../../src/db/pool.ts";
import { handlePurge, handleScore, handleTranscribe } from "../../src/jobs/handlers.ts";
import { purgeApiTraffic } from "../../src/repo/api-keys.ts";

let pool: Pool;
let fx: Fixture;
let ctx: Awaited<ReturnType<typeof testApp>>;
const auth = async (sub: string) => ({ Authorization: `Bearer ${await ctx.sign(sub)}` });

beforeAll(async () => {
  pool = await testPool();
});
afterAll(async () => {
  await pool.end();
});
beforeEach(async () => {
  await resetData(pool);
  fx = await seedFixture(pool);
  ctx = await testApp(pool);
});

function tone(seconds: number, spans: [number, number][]): Float32Array {
  const out = new Float32Array(seconds * 16_000);
  for (const [a, b] of spans)
    for (let i = a * 16_000; i < b * 16_000; i++) out[i] = 0.4 * Math.sin(i / 3);
  return out;
}
const stereo = () => encodeWav([tone(10, [[1, 3]]), tone(10, [[5, 7]])], 16_000);

/** Uploads one stereo call for agent A as the QA reviewer and returns its id. */
async function uploadCall(agentId = fx.agentA, language?: string): Promise<string> {
  const headers = await auth(fx.users.qa);
  const signed = await request(ctx.app)
    .post("/api/uploads/sign")
    .set(headers)
    .send({ files: [{ name: "call.wav", type: "audio/wav", size: 1000 }] })
    .expect(200);
  const path = (signed.body as { uploads: { path: string }[] }).uploads[0]!.path;
  ctx.storage.objects.set(path, stereo());
  const confirmed = await request(ctx.app)
    .post("/api/uploads/confirm")
    .set(headers)
    .send({
      files: [
        {
          path,
          originalFilename: "call.wav",
          mimeType: "audio/wav",
          sizeBytes: 1000,
          agentId,
          teamId: fx.teamId,
          productId: fx.productId,
          callDate: "2026-10-01",
          ...(language ? { language } : {}),
        },
      ],
    })
    .expect(201);
  return (confirmed.body as { callIds: string[] }).callIds[0]!;
}

function judgeBody(statuses: Record<string, [string, number[]]>) {
  return {
    choices: [
      {
        finish_reason: "stop",
        message: {
          content: JSON.stringify({
            items: DEFAULT_RUBRIC.map((i, n) => {
              const [status, segments] = statuses[i.key] ?? [
                i.type === "prohibited" ? "clear" : "met",
                i.type === "prohibited" ? [] : [n % 4],
              ];
              return { key: i.key, status, segments, note: "because" };
            }),
            coaching: ["Tell the customer returns are not guaranteed."],
          }),
        },
      },
    ],
    usage: { prompt_tokens: 3000, completion_tokens: 300 },
  };
}

/** Spreads a line's words evenly over [start, end], the way Whisper lists them for the chunk. */
const spread = (text: string, start: number, end: number) => {
  const words = text.split(" ");
  const step = (end - start) / words.length;
  return words.map((word, i) => ({ word, start: start + i * step, end: start + (i + 1) * step }));
};

const sttBody = (text: string) => ({
  text,
  language: "english",
  duration: 2,
  segments: [
    { start: 0.1, end: 0.9, text, avg_logprob: -0.2, no_speech_prob: 0.01 },
    { start: 1.0, end: 1.9, text: "Is that clear?", avg_logprob: -0.2, no_speech_prob: 0.01 },
  ],
  words: [...spread(text, 0.1, 0.9), ...spread("Is that clear?", 1.0, 1.9)],
});

/** Runs both jobs for a call with a fake Groq: agent says the given line, customer answers. */
async function processCall(
  callId: string,
  agentLine: string,
  statuses: Record<string, [string, number[]]>,
) {
  let n = 0;
  const { gateway } = fakeGateway(pool, {
    stt: () => sttBody(n++ === 0 ? agentLine : "Okay, tell me more."),
    chat: () => judgeBody(statuses),
  });
  const deps = { pool, storage: ctx.storage, gateway, enqueue: recordingQueue().enqueue, log };
  await handleTranscribe(deps, { callId, retryCount: 0 });
  await handleScore(deps, { callId, retryCount: 0 });
}

describe("authentication and roles (US-00-003)", () => {
  it("answers 401 with no token and with a token from another issuer", async () => {
    await request(ctx.app).get("/api/calls").expect(401);
    const forged = await ctx.sign(fx.users.qa, { issuer: "https://evil.example/auth/v1" });
    await request(ctx.app).get("/api/calls").set("Authorization", `Bearer ${forged}`).expect(401);
  });

  it("returns the caller's profile and role", async () => {
    const res = await request(ctx.app)
      .get("/api/me")
      .set(await auth(fx.users.manager))
      .expect(200);

    expect(res.body).toMatchObject({ role: "manager", agentId: null });
  });

  it("answers 403 for a signed-in user with no profile", async () => {
    await request(ctx.app)
      .get("/api/me")
      .set(await auth("00000000-0000-4000-8000-000000000001"))
      .expect(403);
  });

  it("refuses QA and manager routes to a sales agent with 403", async () => {
    const headers = await auth(fx.users.agentA);
    await request(ctx.app).get("/api/review/queue").set(headers).expect(403);
    await request(ctx.app).get("/api/dashboard").set(headers).expect(403);
    await request(ctx.app).post("/api/uploads/sign").set(headers).send({ files: [] }).expect(403);
  });

  it("serves health without a token", async () => {
    await request(ctx.app).get("/api/health").expect(200);
    await request(ctx.app).get("/api/ready").expect(200);
  });
});

describe("upload (US-01-001)", () => {
  it("creates one call per file under one batch and queues transcription", async () => {
    const callId = await uploadCall();

    const call = await pool.query<{ status: string; batch_id: string }>(
      "SELECT status, batch_id FROM calls WHERE id = $1",
      [callId],
    );
    expect(call.rows[0]!.status).toBe("uploaded");
    expect(ctx.queue.sent).toEqual([
      { queue: "transcribe", callId, startAfterSeconds: undefined, priority: 10 },
    ]);
  });

  it("refuses 51 files, a file over 50 MB and a non-audio type", async () => {
    const headers = await auth(fx.users.qa);
    const file = { name: "a.wav", type: "audio/wav", size: 1000 };
    await request(ctx.app)
      .post("/api/uploads/sign")
      .set(headers)
      .send({ files: Array(51).fill(file) })
      .expect(400);
    const big = await request(ctx.app)
      .post("/api/uploads/sign")
      .set(headers)
      .send({ files: [{ ...file, size: 60 * 1024 * 1024 }] })
      .expect(400);
    expect((big.body as { error: { message: string } }).error.message).toContain("50 MB");
    await request(ctx.app)
      .post("/api/uploads/sign")
      .set(headers)
      .send({ files: [{ ...file, type: "video/mp4" }] })
      .expect(400);
  });

  it("refuses to confirm a path issued to another user", async () => {
    const res = await request(ctx.app)
      .post("/api/uploads/confirm")
      .set(await auth(fx.users.manager))
      .send({
        files: [
          {
            path: `${fx.users.qa}/x.wav`,
            originalFilename: "x.wav",
            mimeType: "audio/wav",
            sizeBytes: 10,
            agentId: fx.agentA,
            teamId: fx.teamId,
            productId: fx.productId,
            callDate: "2026-10-01",
          },
        ],
      });

    expect(res.status).toBe(403);
  });
});

describe("ownership (tenet 4, US-00-001, US-02-003)", () => {
  it("lets an agent read their own call and answers 404 for another agent's call", async () => {
    const callId = await uploadCall(fx.agentA);

    await request(ctx.app)
      .get(`/api/calls/${callId}`)
      .set(await auth(fx.users.agentA))
      .expect(200);
    await request(ctx.app)
      .get(`/api/calls/${callId}`)
      .set(await auth(fx.users.agentB))
      .expect(404);
    const list = await request(ctx.app)
      .get("/api/calls")
      .set(await auth(fx.users.agentB))
      .expect(200);
    expect((list.body as { items: unknown[] }).items).toEqual([]);
  });

  it("issues a 10 minute audio URL to the owner, audits it, and refuses another agent", async () => {
    const callId = await uploadCall(fx.agentA);

    const res = await request(ctx.app)
      .post(`/api/calls/${callId}/audio-url`)
      .set(await auth(fx.users.agentA))
      .expect(200);
    await request(ctx.app)
      .post(`/api/calls/${callId}/audio-url`)
      .set(await auth(fx.users.agentB))
      .expect(404);

    expect(res.body).toMatchObject({ expiresInSeconds: 600 });
    const audit = await pool.query(
      "SELECT 1 FROM audit_events WHERE action = 'audio_url_issued' AND call_id = $1",
      [callId],
    );
    expect(audit.rowCount).toBe(1);
  });

  it("issues a download link that saves the recording under its original name", async () => {
    const callId = await uploadCall(fx.agentA);

    const res = await request(ctx.app)
      .post(`/api/calls/${callId}/audio-url`)
      .set(await auth(fx.users.qa))
      .send({ download: true })
      .expect(200);
    await request(ctx.app)
      .post(`/api/calls/${callId}/audio-url`)
      .set(await auth(fx.users.agentB))
      .send({ download: true })
      .expect(404);

    expect((res.body as { url: string }).url).toContain("&download=call.wav");
  });

  it("reverses migration 0003 with its down file and applies it again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0003_transcript_words.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0003_transcript_words.sql"), "utf8");
    const hasWords = async (client: Client) =>
      (
        await client.query(
          "SELECT 1 FROM information_schema.columns WHERE table_name = 'transcript_segments' AND column_name = 'words'",
        )
      ).rowCount;
    const client = await pool.connect();
    try {
      // DDL is transactional in Postgres: roll back so the shared test schema is untouched.
      await client.query("BEGIN");

      await client.query(down);
      const afterDown = await hasWords(client);
      await client.query(up);
      const afterUp = await hasWords(client);

      expect([afterDown, afterUp]).toEqual([0, 1]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("reverses migration 0004 with its down file and applies it again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0004_call_language.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0004_call_language.sql"), "utf8");
    const columns = async (client: Client) =>
      (
        await client.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
            WHERE (table_name, column_name) IN (('calls', 'language'), ('transcript_segments', 'text_en'))
            ORDER BY column_name`,
        )
      ).rows.map((r) => r.column_name);
    const client = await pool.connect();
    try {
      // DDL is transactional in Postgres: roll back so the shared test schema is untouched.
      await client.query("BEGIN");

      await client.query(down);
      const afterDown = await columns(client);
      await client.query(up);
      const afterUp = await columns(client);

      expect([afterDown, afterUp]).toEqual([[], ["language", "text_en"]]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("reverses migration 0005 with its down file and applies it again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0005_call_archive.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0005_call_archive.sql"), "utf8");
    const columns = async (client: Client) =>
      (
        await client.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
            WHERE table_name = 'calls' AND column_name IN ('archived_at', 'deleted_at')
            ORDER BY column_name`,
        )
      ).rows.map((r) => r.column_name);
    const client = await pool.connect();
    try {
      // DDL is transactional in Postgres: roll back so the shared test schema is untouched.
      await client.query("BEGIN");

      await client.query(down);
      const afterDown = await columns(client);
      await client.query(up);
      const afterUp = await columns(client);

      expect([afterDown, afterUp]).toEqual([[], ["archived_at", "deleted_at"]]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("reverses migration 0006 with its down file and applies it again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0006_dashboard_indexes.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0006_dashboard_indexes.sql"), "utf8");
    const indexes = async (client: Client) =>
      (
        await client.query<{ indexname: string }>(
          "SELECT indexname FROM pg_indexes WHERE indexname = 'ix_calls_agent_call_date'",
        )
      ).rows.map((r) => r.indexname);
    const client = await pool.connect();
    try {
      // DDL is transactional in Postgres: roll back so the shared test schema is untouched.
      await client.query("BEGIN");

      await client.query(down);
      const afterDown = await indexes(client);
      await client.query(up);
      const afterUp = await indexes(client);

      expect([afterDown, afterUp]).toEqual([[], ["ix_calls_agent_call_date"]]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("reverses migration 0007 with its down file and applies it again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0007_batches.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0007_batches.sql"), "utf8");
    const tables = async (client: Client) =>
      (
        await client.query<{ table_name: string }>(
          "SELECT table_name FROM information_schema.tables WHERE table_name = 'batches'",
        )
      ).rows.map((r) => r.table_name);
    const client = await pool.connect();
    try {
      // DDL is transactional in Postgres: roll back so the shared test schema is untouched.
      await client.query("BEGIN");

      await client.query(down);
      const afterDown = await tables(client);
      await client.query(up);
      const afterUp = await tables(client);

      expect([afterDown, afterUp]).toEqual([[], ["batches"]]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("reverses migration 0008 with its down file and applies it again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0008_api_keys.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0008_api_keys.sql"), "utf8");
    const tables = async (client: Client) =>
      (
        await client.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables
            WHERE table_name IN ('api_keys', 'api_requests', 'rate_limit_windows') ORDER BY 1`,
        )
      ).rows.map((r) => r.table_name);
    const client = await pool.connect();
    try {
      // DDL is transactional in Postgres: roll back so the shared test schema is untouched.
      await client.query("BEGIN");

      await client.query(down);
      const afterDown = await tables(client);
      await client.query(up);
      const afterUp = await tables(client);

      expect([afterDown, afterUp]).toEqual([
        [],
        ["api_keys", "api_requests", "rate_limit_windows"],
      ]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("enables row level security on every app table", async () => {
    const { rows } = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      "SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'",
    );

    expect(rows.filter((r) => !r.relrowsecurity)).toEqual([]);
  });
});

describe("call list: search, filters, pages, archive and delete (ADR-0015)", () => {
  interface ListBody {
    items: { id: string; flag: string; archivedAt: string | null }[];
    total: number;
  }
  const list = async (query: string, sub = fx.users.qa) =>
    (
      await request(ctx.app)
        .get(`/api/calls?${query}`)
        .set(await auth(sub))
        .expect(200)
    ).body as ListBody;

  it("searches by agent, filters by language and flag, and numbers pages", async () => {
    const a1 = await uploadCall(fx.agentA);
    const a2 = await uploadCall(fx.agentA, "hi-IN");
    const b1 = await uploadCall(fx.agentB);

    const byAgent = await list("q=agent%20b");
    const hindi = await list("language=hi-IN");
    const pending = await list("flag=pending");
    const page2 = await list("limit=2&page=2");

    expect(byAgent.items.map((i) => i.id)).toEqual([b1]);
    expect(hindi.items.map((i) => i.id)).toEqual([a2]);
    expect(pending.total).toBe(3);
    expect(page2).toMatchObject({ total: 3 });
    expect(page2.items).toHaveLength(1);
    expect([a1, a2, b1]).toContain(page2.items[0]!.id);
  });

  it("treats % and _ in a search as plain characters", async () => {
    await uploadCall(fx.agentA);

    expect((await list("q=%25")).total).toBe(0);
  });

  it("keeps an agent to their own calls under every filter", async () => {
    await uploadCall(fx.agentA);
    await uploadCall(fx.agentB);

    const seen = await list(`q=agent&agentId=${fx.agentB}`, fx.users.agentA);

    expect(seen.total).toBe(0);
  });

  it("archives a call out of the list and the queue, and unarchives it back", async () => {
    const callId = await uploadCall();
    await processCall(callId, "This plan gives guaranteed returns of 12 percent.", {
      guaranteed_returns: ["breach", [0]],
    });
    const headers = await auth(fx.users.qa);

    await request(ctx.app).post(`/api/calls/${callId}/archive`).set(headers).expect(204);

    expect((await list("")).total).toBe(0);
    expect((await list("archived=true")).items[0]).toMatchObject({ id: callId, flag: "flagged" });
    const queue = await request(ctx.app).get("/api/review/queue").set(headers).expect(200);
    expect((queue.body as { items: unknown[] }).items).toEqual([]);
    await request(ctx.app).post(`/api/calls/${callId}/unarchive`).set(headers).expect(204);
    expect((await list("")).items[0]).toMatchObject({ id: callId, archivedAt: null });
  });

  it("lets a manager delete a call, which then disappears everywhere", async () => {
    const callId = await uploadCall();
    const manager = await auth(fx.users.manager);

    await request(ctx.app).post(`/api/calls/${callId}/delete`).set(manager).expect(204);

    await request(ctx.app).get(`/api/calls/${callId}`).set(manager).expect(404);
    expect((await list("")).total).toBe(0);
    expect((await list("archived=true")).total).toBe(0);
    await request(ctx.app).post(`/api/calls/${callId}/delete`).set(manager).expect(404);
    const audited = await pool.query(
      "SELECT 1 FROM audit_events WHERE call_id = $1 AND action = 'call_deleted'",
      [callId],
    );
    expect(audited.rowCount).toBe(1);
  });

  it("refuses delete to QA and archive to sales agents", async () => {
    const callId = await uploadCall();

    await request(ctx.app)
      .post(`/api/calls/${callId}/delete`)
      .set(await auth(fx.users.qa))
      .expect(403);
    await request(ctx.app)
      .post(`/api/calls/${callId}/archive`)
      .set(await auth(fx.users.agentA))
      .expect(403);
  });
});

describe("pipeline jobs (US-01-002, US-01-003, US-01-005)", () => {
  it("transcribes a Tamil call with Sarvam, translates it and judges the English (ADR-0014)", async () => {
    const callId = await uploadCall(fx.agentA, "ta-IN");
    const sttForms: FormData[] = [];
    const chatBodies: Record<string, unknown>[] = [];
    const tamil = ["இந்த திட்டம் உறுதியான வருமானம் தரும்.", "சரி, சொல்லுங்கள்."];
    let n = 0;
    const { gateway } = fakeGateway(pool, {
      sarvamStt: (form) => {
        sttForms.push(form);
        const text = tamil[n++ % 2]!;
        return {
          transcript: text,
          language_code: "ta-IN",
          timestamps: { words: [text], start_time_seconds: [0.1], end_time_seconds: [1.8] },
        };
      },
      translate: (body) => ({
        translated_text: String(body.input).replace(/\] .*$/gm, (m) =>
          m.includes("உறுதியான") ? "] This plan gives guaranteed returns." : "] Okay, go on.",
        ),
        source_language_code: "ta-IN",
      }),
      chat: (body) => {
        chatBodies.push(body);
        return judgeBody({ guaranteed_returns: ["breach", [0]] });
      },
    });
    const deps = { pool, storage: ctx.storage, gateway, enqueue: recordingQueue().enqueue, log };

    await handleTranscribe(deps, { callId, retryCount: 0 });
    await handleScore(deps, { callId, retryCount: 0 });

    expect(sttForms[0]!.get("language_code")).toBe("ta-IN");
    expect(sttForms[0]!.get("model")).toBe("saaras:v4");
    expect(JSON.stringify(chatBodies[0])).toContain("This plan gives guaranteed returns.");
    expect(JSON.stringify(chatBodies[0])).not.toContain("உறுதியான");
    const detail = await request(ctx.app)
      .get(`/api/calls/${callId}`)
      .set(await auth(fx.users.qa))
      .expect(200);
    const body = detail.body as {
      call: { language: string; status: string };
      segments: { channel: string; text: string; translation: string | null; words: unknown[] }[];
      findings: { itemKey: string; status: string; quote: string | null }[];
    };
    expect(body.call).toMatchObject({ language: "ta-IN", status: "scored" });
    const agentLine = body.segments.find((x) => x.channel === "agent")!;
    expect(agentLine).toMatchObject({
      text: tamil[0],
      translation: "This plan gives guaranteed returns.",
      words: [],
    });
    const breach = body.findings.find(
      (f) => f.itemKey === "guaranteed_returns" && f.status === "breach",
    );
    // The quote is what was said, in Tamil, not the translation.
    expect(breach!.quote).toBe(tamil[0]);
  });

  it("keeps each segment's words in call time and returns them with the call", async () => {
    const callId = await uploadCall();

    await processCall(callId, "This plan gives guaranteed returns.", {});

    const detail = await request(ctx.app)
      .get(`/api/calls/${callId}`)
      .set(await auth(fx.users.qa))
      .expect(200);
    const segments = (
      detail.body as {
        segments: {
          startMs: number;
          endMs: number;
          text: string;
          words: { text: string; startMs: number; endMs: number }[];
        }[];
      }
    ).segments;
    const first = segments[0]!;
    expect(first.words.map((w) => w.text).join(" ")).toBe(first.text);
    for (const w of first.words) {
      expect(w.startMs).toBeGreaterThanOrEqual(first.startMs);
      expect(w.endMs).toBeLessThanOrEqual(first.endMs + 1);
    }
    expect(segments[1]!.words.map((w) => w.text)).toEqual(["Is", "that", "clear?"]);
  });

  it("transcribes both channels, scores once and routes a guaranteed-returns breach to QA", async () => {
    const callId = await uploadCall();

    await processCall(callId, "This plan gives guaranteed returns of 12 percent.", {
      guaranteed_returns: ["breach", [0]],
    });

    const segments = await pool.query<{ channel: string }>(
      "SELECT channel FROM transcript_segments WHERE call_id = $1 ORDER BY seq",
      [callId],
    );
    expect(segments.rows.map((r) => r.channel)).toEqual(["agent", "agent", "customer", "customer"]);
    const chat = await pool.query(
      "SELECT 1 FROM model_calls WHERE call_id = $1 AND kind = 'chat' AND status = 'ok'",
      [callId],
    );
    expect(chat.rowCount).toBe(1);
    const detail = await request(ctx.app)
      .get(`/api/calls/${callId}`)
      .set(await auth(fx.users.qa))
      .expect(200);
    const body = detail.body as {
      call: { status: string; needsReview: boolean };
      findings: { itemKey: string; status: string; startMs: number }[];
    };
    expect(body.call).toMatchObject({ status: "scored", needsReview: true });
    const breach = body.findings.find(
      (f) => f.itemKey === "guaranteed_returns" && f.status === "breach",
    )!;
    // The agent's tone starts at 1 s; times must land within 500 ms of it (AC-US-01-002-3).
    expect(Math.abs(breach.startMs - 1000)).toBeLessThan(500);
    const queue = await request(ctx.app)
      .get("/api/review/queue")
      .set(await auth(fx.users.qa))
      .expect(200);
    expect((queue.body as { items: { id: string }[] }).items.map((i) => i.id)).toEqual([callId]);
  });

  it("keeps a clean call out of the QA queue", async () => {
    const callId = await uploadCall();

    await processCall(callId, "Good morning, this is Ravi from Suraksha.", {});

    const queue = await request(ctx.app)
      .get("/api/review/queue")
      .set(await auth(fx.users.qa))
      .expect(200);
    expect((queue.body as { items: unknown[] }).items).toEqual([]);
  });

  it("marks a mono recording failed with the stereo message", async () => {
    const callId = await uploadCall();
    const path = (
      await pool.query<{ storage_path: string }>("SELECT storage_path FROM calls WHERE id = $1", [
        callId,
      ])
    ).rows[0]!.storage_path;
    ctx.storage.objects.set(path, encodeWav([tone(3, [[0, 2]])], 16_000));
    const { gateway } = fakeGateway(pool, {});

    await handleTranscribe(
      { pool, storage: ctx.storage, gateway, enqueue: recordingQueue().enqueue, log },
      { callId, retryCount: 0 },
    );

    const row = await pool.query<{ status: string; error: string }>(
      "SELECT status, error FROM calls WHERE id = $1",
      [callId],
    );
    expect(row.rows[0]).toEqual({
      status: "failed",
      error: "Recording must be stereo: agent left, customer right",
    });
  });

  it("reschedules instead of failing when the provider rate-limits", async () => {
    const callId = await uploadCall();
    const queue = recordingQueue();
    const { gateway, fetch } = fakeGateway(pool, {});
    fetch.mockImplementation(() =>
      Promise.resolve(new Response("slow", { status: 429, headers: { "retry-after": "20" } })),
    );

    await handleTranscribe(
      { pool, storage: ctx.storage, gateway, enqueue: queue.enqueue, log },
      { callId, retryCount: 0 },
    );

    expect(queue.sent).toEqual([{ queue: "transcribe", callId, startAfterSeconds: 21 }]);
    const row = await pool.query<{ status: string }>("SELECT status FROM calls WHERE id = $1", [
      callId,
    ]);
    // The call is handed back so the rescheduled job can claim it.
    expect(row.rows[0]!.status).toBe("uploaded");
  });

  it("skips a job whose call has already moved on", async () => {
    const callId = await uploadCall();
    await processCall(callId, "Hello.", {});
    const { gateway, fetch } = fakeGateway(pool, {});

    await handleTranscribe(
      { pool, storage: ctx.storage, gateway, enqueue: recordingQueue().enqueue, log },
      { callId, retryCount: 0 },
    );

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("QA review and agreement (US-01-006, US-01-007)", () => {
  it("records decisions, a judge miss, completes the review and reports agreement per item", async () => {
    const callId = await uploadCall();
    await processCall(callId, "Offer ends today, guaranteed returns.", {
      guaranteed_returns: ["breach", [0]],
      cooling_off: ["missed", []],
    });
    const qa = await auth(fx.users.qa);
    const detail = await request(ctx.app).get(`/api/calls/${callId}`).set(qa).expect(200);
    const findings = (
      detail.body as { findings: { id: string; itemKey: string; source: string }[] }
    ).findings;

    await request(ctx.app).post(`/api/calls/${callId}/review/complete`).set(qa).expect(409);
    for (const f of findings) {
      const decision = f.itemKey === "need_discovery" ? "disagree" : "agree";
      await request(ctx.app)
        .put(`/api/findings/${f.id}/review`)
        .set(qa)
        .send({ decision })
        .expect(204);
    }
    await request(ctx.app)
      .post(`/api/calls/${callId}/findings`)
      .set(qa)
      .send({ itemKey: "misrepresentation", status: "breach", segmentSeq: 0 })
      .expect(201);
    await request(ctx.app).post(`/api/calls/${callId}/review/complete`).set(qa).expect(204);

    const queue = await request(ctx.app).get("/api/review/queue").set(qa).expect(200);
    expect((queue.body as { items: unknown[] }).items).toEqual([]);
    const agreement = await request(ctx.app)
      .get("/api/agreement")
      .set(await auth(fx.users.manager))
      .expect(200);
    const items = (
      agreement.body as {
        items: {
          key: string;
          agreed: number;
          disagreed: number;
          judgeMisses: number;
          rate: number | null;
        }[];
      }
    ).items;
    expect(items.find((i) => i.key === "need_discovery")).toMatchObject({
      agreed: 0,
      disagreed: 1,
      rate: 0,
    });
    expect(items.find((i) => i.key === "misrepresentation")).toMatchObject({
      judgeMisses: 1,
      rate: 0,
    });
    expect(items.find((i) => i.key === "greeting")).toMatchObject({ agreed: 1, rate: 1 });
  });

  it("only lets QA reviewers decide", async () => {
    const callId = await uploadCall();
    await processCall(callId, "guaranteed returns", { guaranteed_returns: ["breach", [0]] });
    const finding = (
      await pool.query<{ id: string }>("SELECT id FROM findings WHERE call_id = $1 LIMIT 1", [
        callId,
      ])
    ).rows[0]!;

    await request(ctx.app)
      .put(`/api/findings/${finding.id}/review`)
      .set(await auth(fx.users.manager))
      .send({ decision: "agree" })
      .expect(403);
  });
});

describe("scorecard, coaching and dashboard (US-00-001, US-00-002, US-01-008)", () => {
  it("shows an agent their pass rates and top coaching points, excluding findings QA rejected", async () => {
    for (let i = 0; i < 2; i++) {
      const callId = await uploadCall();
      await processCall(callId, "Hello there.", {
        cooling_off: ["missed", []],
        consent: ["missed", []],
        disclosure: ["partial", [0]],
      });
    }

    const res = await request(ctx.app)
      .get("/api/scorecard/me")
      .set(await auth(fx.users.agentA))
      .expect(200);

    const card = res.body as {
      callsScored: number;
      coaching: { key: string; misses: number }[];
      items: { key: string; passRate: number | null }[];
    };
    expect(card.callsScored).toBe(2);
    expect(card.coaching.map((c) => c.key).sort()).toEqual([
      "consent",
      "cooling_off",
      "disclosure",
    ]);
    expect(card.items.find((i) => i.key === "greeting")!.passRate).toBe(1);
    await request(ctx.app)
      .get("/api/scorecard/me")
      .set(await auth(fx.users.agentB))
      .expect(200);
  });

  it("groups results by team for managers", async () => {
    const callId = await uploadCall();
    await processCall(callId, "guaranteed returns", { guaranteed_returns: ["breach", [0]] });

    const res = await request(ctx.app)
      .get("/api/dashboard?groupBy=team")
      .set(await auth(fx.users.manager))
      .expect(200);

    expect(
      (res.body as { groups: { name: string; callsScored: number; flagRate: number }[] }).groups[0],
    ).toMatchObject({
      name: "Team One",
      callsScored: 1,
      flagRate: 1,
    });
  });

  it("groups results by agent and by language, leaving deleted calls out", async () => {
    const english = await uploadCall(fx.agentA);
    await processCall(english, "guaranteed returns", { guaranteed_returns: ["breach", [0]] });
    const gone = await uploadCall(fx.agentB);
    await processCall(gone, "Hello there", {});
    const manager = await auth(fx.users.manager);
    await request(ctx.app).post(`/api/calls/${gone}/delete`).set(manager).expect(204);

    const byAgent = await request(ctx.app)
      .get("/api/dashboard?groupBy=agent")
      .set(manager)
      .expect(200);
    const byLanguage = await request(ctx.app)
      .get("/api/dashboard?groupBy=language")
      .set(manager)
      .expect(200);

    interface Groups {
      groups: { name: string; callsScored: number }[];
    }
    expect((byAgent.body as Groups).groups.map((g) => [g.name, g.callsScored])).toEqual([
      ["Agent A", 1],
      ["Agent B", 0],
    ]);
    expect((byLanguage.body as Groups).groups.map((g) => [g.name, g.callsScored])).toEqual([
      ["en-IN", 1],
    ]);
  });
});

describe("batches (ADR-0017)", () => {
  /** Signs, stores and confirms n stereo files as the QA reviewer; returns the confirm body. */
  async function confirmFiles(
    n: number,
    extra: { batchId?: string; batchName?: string; names?: string[] } = {},
    as = fx.users.qa,
  ) {
    const headers = await auth(as);
    const signed = await request(ctx.app)
      .post("/api/uploads/sign")
      .set(headers)
      .send({
        files: Array.from({ length: n }, () => ({ name: "c.wav", type: "audio/wav", size: 1000 })),
      })
      .expect(200);
    const paths = (signed.body as { uploads: { path: string }[] }).uploads.map((u) => u.path);
    for (const p of paths) ctx.storage.objects.set(p, stereo());
    const res = await request(ctx.app)
      .post("/api/uploads/confirm")
      .set(headers)
      .send({
        ...(extra.batchId ? { batchId: extra.batchId } : {}),
        ...(extra.batchName ? { batchName: extra.batchName } : {}),
        files: paths.map((path, i) => ({
          path,
          originalFilename: extra.names?.[i] ?? `call-${String(i + 1)}.wav`,
          mimeType: "audio/wav",
          sizeBytes: 1000,
          agentId: fx.agentA,
          teamId: fx.teamId,
          productId: fx.productId,
          callDate: "2026-10-01",
        })),
      });
    return res;
  }

  /** Adds n bare calls to a batch straight in SQL, to reach the size limits quickly. */
  async function padBatch(batchId: string, n: number) {
    await pool.query(
      `INSERT INTO calls (agent_id, team_id, product_id, call_date, batch_id, uploaded_by, original_filename,
                          mime_type, size_bytes, storage_path, retention_until)
       SELECT $1, $2, $3, '2026-10-01', $4, $5::uuid, 'pad.wav', 'audio/wav', 10, $5::text || '/pad-' || g || '.wav', current_date + 90
         FROM generate_series(1, $6) g`,
      [fx.agentA, fx.teamId, fx.productId, batchId, fx.users.qa, n],
    );
  }

  interface BatchBody {
    id: string;
    name: string;
    total: number;
    queued: number;
    scored: number;
    failed: number;
    state: string;
  }

  it("fills one named batch over several chunks, queued behind one-off uploads", async () => {
    const first = await confirmFiles(2, { batchName: "October leads" });
    const batchId = (first.body as { batchId: string }).batchId;
    const second = await confirmFiles(1, { batchId });

    const list = await request(ctx.app)
      .get("/api/batches")
      .set(await auth(fx.users.manager))
      .expect(200);

    expect((second.body as { batchId: string }).batchId).toBe(batchId);
    expect(list.body).toMatchObject({
      total: 1,
      items: [{ name: "October leads", total: 3, queued: 3, state: "processing", source: "web" }],
    });
    expect(ctx.queue.sent.map((j) => j.priority)).toEqual([10, 10, 0]);
  });

  it("refuses to fill a batch someone else started, an archived one, or one past 500 calls", async () => {
    const batchId = ((await confirmFiles(1)).body as { batchId: string }).batchId;

    const notYours = await confirmFiles(1, { batchId }, fx.users.manager);
    await padBatch(batchId, 499);
    const full = await confirmFiles(1, { batchId });
    await request(ctx.app)
      .patch(`/api/batches/${batchId}`)
      .set(await auth(fx.users.qa))
      .send({ archived: true })
      .expect(200);
    const archived = await confirmFiles(1, { batchId });

    expect([notYours.status, full.status, archived.status]).toEqual([404, 409, 409]);
    expect((full.body as { error: { message: string } }).error.message).toContain("500");
  });

  it("renames and archives a batch for its creator or a manager, and audits each change", async () => {
    const batchId = ((await confirmFiles(1)).body as { batchId: string }).batchId;

    await request(ctx.app)
      .patch(`/api/batches/${batchId}`)
      .set(await auth(fx.users.qa))
      .send({ name: "Renamed" })
      .expect(200);
    await request(ctx.app)
      .patch(`/api/batches/${batchId}`)
      .set(await auth(fx.users.manager))
      .send({ archived: true })
      .expect(200);
    await request(ctx.app)
      .patch(`/api/batches/${batchId}`)
      .set(await auth(fx.users.agentA))
      .send({ name: "Mine now" })
      .expect(403);
    const live = await request(ctx.app)
      .get("/api/batches")
      .set(await auth(fx.users.qa));
    const archived = await request(ctx.app)
      .get("/api/batches?archived=true")
      .set(await auth(fx.users.qa));
    const audits = await pool.query<{ action: string }>(
      "SELECT action FROM audit_events WHERE batch_id = $1 ORDER BY id",
      [batchId],
    );

    expect((live.body as { total: number }).total).toBe(0);
    expect((archived.body as { items: BatchBody[] }).items[0]?.name).toBe("Renamed");
    expect(audits.rows.map((r) => r.action)).toEqual([
      "batch_created",
      "batch_renamed",
      "batch_archived",
    ]);
  });

  it("filters by state and retries only the failed calls of a batch", async () => {
    const done = ((await confirmFiles(1, { batchName: "Done" })).body as { callIds: string[] })
      .callIds[0]!;
    await processCall(done, "Hello there.", {});
    const mixed = (await confirmFiles(2, { batchName: "Mixed" })).body as {
      batchId: string;
      callIds: string[];
    };
    await pool.query("UPDATE calls SET status = 'failed', error = 'boom' WHERE id = ANY($1)", [
      mixed.callIds,
    ]);
    const qa = await auth(fx.users.qa);
    ctx.queue.sent.length = 0;

    const failing = await request(ctx.app).get("/api/batches?state=has_failures").set(qa);
    const completed = await request(ctx.app).get("/api/batches?state=completed").set(qa);
    const retried = await request(ctx.app)
      .post(`/api/batches/${mixed.batchId}/retry-failed`)
      .set(qa)
      .expect(202);

    expect((failing.body as { items: BatchBody[] }).items.map((b) => b.name)).toEqual(["Mixed"]);
    expect((completed.body as { items: BatchBody[] }).items.map((b) => b.name)).toEqual(["Done"]);
    expect(retried.body).toEqual({ queued: 2 });
    expect(ctx.queue.sent.map((j) => [j.queue, j.priority])).toEqual([
      ["transcribe", 0],
      ["transcribe", 0],
    ]);
  });

  it("lists a batch's calls and shows its detail with breaches and spend", async () => {
    const body = (await confirmFiles(1, { batchName: "One" })).body as {
      batchId: string;
      callIds: string[];
    };
    await processCall(body.callIds[0]!, "guaranteed returns", {
      guaranteed_returns: ["breach", [0]],
    });
    await confirmFiles(1, { batchName: "Other" });
    const qa = await auth(fx.users.qa);

    const calls = await request(ctx.app).get(`/api/calls?batchId=${body.batchId}`).set(qa);
    const detail = await request(ctx.app).get(`/api/batches/${body.batchId}`).set(qa).expect(200);

    expect(calls.body).toMatchObject({ total: 1, items: [{ batchName: "One" }] });
    expect(detail.body).toMatchObject({ scored: 1, breaches: 1, state: "completed" });
    expect((detail.body as { costUsd: number }).costUsd).toBeGreaterThan(0);
    await request(ctx.app)
      .get("/api/batches/00000000-0000-4000-8000-000000000000")
      .set(qa)
      .expect(404);
    await request(ctx.app)
      .get("/api/batches")
      .set(await auth(fx.users.agentA))
      .expect(403);
  });

  it("exports results as CSV, one column per rubric item, with formulas defused", async () => {
    const body = (await confirmFiles(1, { names: ["=cmd.wav"] })).body as {
      batchId: string;
      callIds: string[];
    };
    await processCall(body.callIds[0]!, "guaranteed returns", {
      guaranteed_returns: ["breach", [0]],
    });

    const res = await request(ctx.app)
      .get(`/api/batches/${body.batchId}/results.csv`)
      .set(await auth(fx.users.qa))
      .expect(200);

    const [header, row] = res.text.trim().split("\r\n");
    const cells = header!.split(",");
    const values = row!.split(",");
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(values[cells.indexOf("file")]).toBe("'=cmd.wav");
    expect(values[cells.indexOf("guaranteed_returns")]).toBe("fail");
    expect(values[cells.indexOf("greeting")]).toBe("pass");
  });

  it("streams a ZIP with the results, transcripts and recordings", async () => {
    const body = (await confirmFiles(1, { batchName: "Zip me" })).body as {
      batchId: string;
      callIds: string[];
    };
    await processCall(body.callIds[0]!, "Hello there.", {});

    const res = await request(ctx.app)
      .get(`/api/batches/${body.batchId}/export.zip?include=audio,transcripts`)
      .set(await auth(fx.users.qa))
      .buffer(true)
      .parse((r, done) => {
        const parts: Buffer[] = [];
        r.on("data", (c: Buffer) => parts.push(c));
        r.on("end", () => {
          done(null, Buffer.concat(parts));
        });
      })
      .expect(200);

    const files = unzipSync(new Uint8Array(res.body as Buffer));
    expect(Object.keys(files).sort()).toEqual([
      "audio/001-call-1.wav",
      "results.csv",
      "transcripts/001-call-1.json",
      "transcripts/001-call-1.txt",
    ]);
    expect(files["audio/001-call-1.wav"]).toEqual(stereo());
    expect(new TextDecoder().decode(files["transcripts/001-call-1.txt"])).toContain(
      "] Agent: Hello there.",
    );
  });

  it("issues a short-lived export link the browser opens without its token", async () => {
    const body = (await confirmFiles(1, { batchName: "Linked" })).body as {
      batchId: string;
      callIds: string[];
    };
    await processCall(body.callIds[0]!, "Hello there.", {});
    const issued = await request(ctx.app)
      .post(`/api/batches/${body.batchId}/export-link`)
      .set(await auth(fx.users.qa))
      .send({ format: "csv" })
      .expect(200);
    const { url, expiresInSeconds } = issued.body as { url: string; expiresInSeconds: number };

    const csv = await request(ctx.app).get(url).expect(200);
    // SCC-1: changing the last character was flaky; it carries only 4 bits of the
    // signature, so some swaps decoded to the same bytes. The first carries 6.
    const sigAt = url.lastIndexOf(".") + 1;
    const flipped = url[sigAt] === "A" ? "B" : "A";
    const tampered = await request(ctx.app).get(
      url.slice(0, sigAt) + flipped + url.slice(sigAt + 1),
    );
    await pool.query(
      `WITH a AS (INSERT INTO agents (team_id, name, external_code) VALUES ($1, 'Agent C', 'C1') RETURNING id)
       UPDATE profiles SET role = 'agent', agent_id = (SELECT id FROM a) WHERE id = $2`,
      [fx.teamId, fx.users.qa],
    );
    const demoted = await request(ctx.app).get(url);

    expect(expiresInSeconds).toBe(300);
    expect(csv.text).toContain("call-1.wav");
    expect([tampered.status, demoted.status]).toEqual([401, 403]);
    await request(ctx.app)
      .post(`/api/batches/${body.batchId}/export-link`)
      .set(await auth(fx.users.agentA))
      .send({ format: "csv" })
      .expect(403);
  });

  it("refuses a ZIP of more than 200 calls and an unknown part", async () => {
    const batchId = ((await confirmFiles(1)).body as { batchId: string }).batchId;
    await padBatch(batchId, 200);
    const qa = await auth(fx.users.qa);

    const big = await request(ctx.app).get(`/api/batches/${batchId}/export.zip`).set(qa);
    const odd = await request(ctx.app)
      .get(`/api/batches/${batchId}/export.zip?include=secrets`)
      .set(qa);

    expect([big.status, odd.status]).toEqual([413, 400]);
  });
});

describe("API keys (ADR-0018)", () => {
  /** Creates a key as the manager and returns its id and the secret shown once. */
  async function createKey(body: Record<string, unknown> = {}) {
    const res = await request(ctx.app)
      .post("/api/api-keys")
      .set(await auth(fx.users.manager))
      .send({ name: "CRM sync", scopes: ["calls:read"], ...body })
      .expect(201);
    const created = res.body as { key: { id: string; prefix: string }; secret: string };
    return { id: created.key.id, secret: created.secret, prefix: created.key.prefix };
  }
  const bearer = (secret: string) => ({ Authorization: `Bearer ${secret}` });

  it("shows the secret once, keeps only its hash, and acts as the manager who made it", async () => {
    const key = await createKey();

    const me = await request(ctx.app).get("/api/me").set(bearer(key.secret)).expect(200);
    const list = await request(ctx.app)
      .get("/api/api-keys")
      .set(await auth(fx.users.manager))
      .expect(200);
    const stored = await pool.query<{ secret_hash: Buffer }>(
      "SELECT secret_hash FROM api_keys WHERE id = $1",
      [key.id],
    );

    expect(key.secret).toMatch(new RegExp(`^latte_${key.prefix}_[A-Za-z0-9_-]{43}$`));
    expect((me.body as { id: string }).id).toBe(fx.users.manager);
    // SCC-1: the secret may itself contain "_", so take all 43 characters, not the last fragment.
    expect(JSON.stringify(list.body)).not.toContain(key.secret.slice(-43));
    expect(stored.rows[0]!.secret_hash).toHaveLength(32);
  });

  it("reaches only listed routes, within the key's scopes", async () => {
    const key = await createKey({ scopes: ["calls:read"] });
    const headers = bearer(key.secret);

    const listed = await request(ctx.app).get("/api/calls").set(headers);
    const unscoped = await request(ctx.app)
      .post("/api/uploads/sign")
      .set(headers)
      .send({ files: [{ name: "a.wav", type: "audio/wav", size: 10 }] });
    const unlisted = await request(ctx.app).get("/api/usage").set(headers);
    const keysOfKeys = await request(ctx.app).get("/api/api-keys").set(headers);
    const rubric = await request(ctx.app).get("/api/rubrics/active").set(headers);

    expect(listed.status).toBe(200);
    expect([unscoped.status, (unscoped.body as { error: { code: string } }).error.code]).toEqual([
      403,
      "insufficient_scope",
    ]);
    expect([unlisted, keysOfKeys, rubric].map((r) => r.status)).toEqual([403, 403, 403]);
    expect((keysOfKeys.body as { error: { code: string } }).error.code).toBe("not_for_api_keys");
  });

  it("refuses a revoked key, an expired key, a made-up key and a key whose maker lost the role", async () => {
    const revoked = await createKey();
    const expired = await createKey({ expiresInDays: 30 });
    const orphaned = await createKey();
    const manager = await auth(fx.users.manager);
    await request(ctx.app).post(`/api/api-keys/${revoked.id}/revoke`).set(manager).expect(204);
    await pool.query("UPDATE api_keys SET expires_at = now() - interval '1 second' WHERE id = $1", [
      expired.id,
    ]);

    const answers = [
      await request(ctx.app).get("/api/me").set(bearer(revoked.secret)),
      await request(ctx.app).get("/api/me").set(bearer(expired.secret)),
      await request(ctx.app)
        .get("/api/me")
        .set(bearer(`${revoked.secret.slice(0, -1)}x`)),
    ];
    await pool.query("UPDATE profiles SET role = 'qa_reviewer' WHERE id = $1", [fx.users.manager]);
    const demoted = await request(ctx.app).get("/api/me").set(bearer(orphaned.secret));

    expect(answers.map((r) => r.status)).toEqual([401, 401, 401]);
    expect((answers[0]!.body as { error: { message: string } }).error.message).toContain("revoked");
    expect(demoted.status).toBe(403);
  });

  it("counts requests per bucket and answers 429 with Retry-After past the limit", async () => {
    const key = await createKey({ limits: { read: 2 } });
    const headers = bearer(key.secret);

    const first = await request(ctx.app).get("/api/calls").set(headers);
    await request(ctx.app).get("/api/calls").set(headers);
    const third = await request(ctx.app).get("/api/calls").set(headers);

    expect(first.headers["ratelimit-limit"]).toBe("2");
    expect(first.headers["ratelimit-remaining"]).toBe("1");
    expect(third.status).toBe(429);
    expect(Number(third.headers["retry-after"])).toBeGreaterThan(0);
    expect((third.body as { error: { details: { bucket: string } } }).error.details.bucket).toBe(
      "read",
    );
  });

  // SCC-1: refused requests were not counted, so a key could send unlimited 403s, each one logged.
  it("counts refused requests against the limit too", async () => {
    const key = await createKey({ scopes: ["calls:read"], limits: { read: 2 } });
    const headers = bearer(key.secret);

    const statuses = [
      (await request(ctx.app).get("/api/usage").set(headers)).status,
      (await request(ctx.app).get("/api/rubrics/active").set(headers)).status,
      (await request(ctx.app).get("/api/usage").set(headers)).status,
    ];

    expect(statuses).toEqual([403, 403, 429]);
  });

  it("logs each request by route template and sums it up as metrics", async () => {
    const key = await createKey({ scopes: ["calls:read"] });
    const callId = await uploadCall();
    await request(ctx.app).get(`/api/calls/${callId}`).set(bearer(key.secret)).expect(200);
    await request(ctx.app).get("/api/usage").set(bearer(key.secret)).expect(403);
    const manager = await auth(fx.users.manager);

    await vi.waitFor(async () => {
      const { rows } = await pool.query("SELECT 1 FROM api_requests WHERE api_key_id = $1", [
        key.id,
      ]);
      expect(rows).toHaveLength(2);
    });
    const logs = await request(ctx.app)
      .get(`/api/api-keys/${key.id}/logs`)
      .set(manager)
      .expect(200);
    const errors = await request(ctx.app)
      .get(`/api/api-keys/${key.id}/logs?status=4xx`)
      .set(manager)
      .expect(200);
    const metrics = await request(ctx.app)
      .get(`/api/api-keys/${key.id}/metrics?days=7`)
      .set(manager)
      .expect(200);

    expect(
      (logs.body as { items: { route: string; status: number }[] }).items.map((r) => [
        r.route,
        r.status,
      ]),
    ).toEqual([
      ["(not available to API keys)", 403],
      ["/calls/:id", 200],
    ]);
    expect((errors.body as { total: number }).total).toBe(1);
    expect(metrics.body).toMatchObject({
      totals: { requests: 2, errorRate: 0.5 },
      buckets: expect.arrayContaining([
        expect.objectContaining({ bucket: "read", requests: 2, limit: 600 }),
      ]),
    });
  });

  it("uploads through a key into a batch marked as coming from the API", async () => {
    const key = await createKey({ scopes: ["calls:write", "batches:read"] });
    const headers = bearer(key.secret);
    const signed = await request(ctx.app)
      .post("/api/uploads/sign")
      .set(headers)
      .send({ files: [{ name: "c.wav", type: "audio/wav", size: 1000 }] })
      .expect(200);
    const path = (signed.body as { uploads: { path: string }[] }).uploads[0]!.path;
    ctx.storage.objects.set(path, stereo());

    const confirmed = await request(ctx.app)
      .post("/api/uploads/confirm")
      .set(headers)
      .send({
        batchName: "From the CRM",
        files: [
          {
            path,
            originalFilename: "c.wav",
            mimeType: "audio/wav",
            sizeBytes: 1000,
            agentId: fx.agentA,
            teamId: fx.teamId,
            productId: fx.productId,
            callDate: "2026-10-01",
          },
        ],
      })
      .expect(201);
    const batch = await request(ctx.app)
      .get(`/api/batches/${(confirmed.body as { batchId: string }).batchId}`)
      .set(headers)
      .expect(200);

    expect(batch.body).toMatchObject({ name: "From the CRM", source: "api" });
  });

  it("renames a key and sets its limits, refusing changes once revoked", async () => {
    const key = await createKey();
    const manager = await auth(fx.users.manager);

    const renamed = await request(ctx.app)
      .patch(`/api/api-keys/${key.id}`)
      .set(manager)
      .send({ name: "Dialler", limits: { bulk: 50 } })
      .expect(200);
    await request(ctx.app).post(`/api/api-keys/${key.id}/revoke`).set(manager).expect(204);
    const late = await request(ctx.app)
      .patch(`/api/api-keys/${key.id}`)
      .set(manager)
      .send({ name: "Too late" });
    const tooHigh = await request(ctx.app)
      .post("/api/api-keys")
      .set(manager)
      .send({ name: "Greedy", scopes: ["calls:read"], limits: { read: 1_000_000 } });

    expect(renamed.body).toMatchObject({ name: "Dialler", limits: { bulk: 50, read: 600 } });
    expect([late.status, tooHigh.status]).toEqual([409, 400]);
    await request(ctx.app)
      .get("/api/api-keys")
      .set(await auth(fx.users.qa))
      .expect(403);
  });

  it("publishes the API as OpenAPI, listing only what a key can call", async () => {
    const res = await request(ctx.app).get("/api/openapi.json").expect(200);
    const doc = res.body as { info: { title: string }; paths: Record<string, unknown> };

    expect(doc.info.title).toBe("Latte API");
    expect(Object.keys(doc.paths)).toContain("/api/calls/{id}");
    expect(Object.keys(doc.paths)).not.toContain("/api/api-keys");
  });

  it("forgets requests after 30 days and rate windows after a day", async () => {
    const key = await createKey();
    await pool.query(
      `INSERT INTO api_requests (api_key_id, method, route, bucket, status, duration_ms, request_id, created_at)
       VALUES ($1, 'GET', '/calls', 'read', 200, 5, 'r1', now() - interval '31 days'),
              ($1, 'GET', '/calls', 'read', 200, 5, 'r2', now())`,
      [key.id],
    );

    const removed = await purgeApiTraffic(pool);

    expect(removed).toBe(1);
  });
});

describe("product rubrics and redaction in the pipeline (ADR-0023)", () => {
  it("scores a call with its product's own rubric", async () => {
    const saved = await request(ctx.app)
      .post("/api/rubrics")
      .set(await auth(fx.users.manager))
      .send({ name: "ULIP rubric", items: DEFAULT_RUBRIC, productId: fx.productId })
      .expect(201);
    const callId = await uploadCall();

    await processCall(callId, "Hello there.", {});
    const score = await pool.query<{ rubric_id: string }>(
      "SELECT rubric_id FROM scores WHERE call_id = $1",
      [callId],
    );

    expect(score.rows[0]!.rubric_id).toBe((saved.body as { id: string }).id);
  });

  it("masks a phone number in finding quotes and in the exported transcript", async () => {
    const callId = await uploadCall();
    await processCall(callId, "call me on 98765 43210 for guaranteed returns", {
      guaranteed_returns: ["breach", [0]],
    });
    const qa = await auth(fx.users.qa);

    const detail = await request(ctx.app).get(`/api/calls/${callId}`).set(qa).expect(200);
    const { rows } = await pool.query<{ batch_id: string }>(
      "SELECT batch_id FROM calls WHERE id = $1",
      [callId],
    );
    const zip = await request(ctx.app)
      .get(`/api/batches/${rows[0]!.batch_id}/export.zip?include=transcripts`)
      .set(qa)
      .buffer(true)
      .parse((r, done) => {
        const parts: Buffer[] = [];
        r.on("data", (c: Buffer) => parts.push(c));
        r.on("end", () => {
          done(null, Buffer.concat(parts));
        });
      })
      .expect(200);

    const quotes = (detail.body as { findings: { quote: string | null }[] }).findings.map(
      (f) => f.quote ?? "",
    );
    const files = unzipSync(new Uint8Array(zip.body as Buffer));
    const txt = new TextDecoder().decode(
      Object.entries(files).find(([n]) => n.endsWith(".txt"))![1],
    );
    expect(quotes.join(" ")).toContain("[phone ••••3210]");
    expect(quotes.join(" ")).not.toContain("98765");
    expect(txt).toContain("[phone ••••3210]");
    expect(txt).not.toContain("98765 43210");
  });
});

describe("pipeline webhook events (ADR-0021)", () => {
  it("announces a scored call, then the batch once its last call is done", async () => {
    await request(ctx.app)
      .post("/api/webhooks")
      .set(await auth(fx.users.manager))
      .send({ url: "https://hooks.example.com/x", events: ["call.scored", "batch.completed"] })
      .expect(201);
    const callId = await uploadCall();

    await processCall(callId, "guaranteed returns", { guaranteed_returns: ["breach", [0]] });
    const { rows } = await pool.query<{
      event_type: string;
      payload: { data: Record<string, unknown> };
    }>("SELECT event_type, payload FROM webhook_deliveries ORDER BY created_at, event_type");

    expect(rows.map((r) => r.event_type).sort()).toEqual(["batch.completed", "call.scored"]);
    expect(rows.find((r) => r.event_type === "call.scored")!.payload.data).toMatchObject({
      callId,
      breaches: 1,
      needsReview: true,
    });
    expect(JSON.stringify(rows)).not.toContain("guaranteed returns");
  });
});

describe("performance leaderboard and dashboard highlights", () => {
  interface Board {
    items: { name: string; callsScored: number; breaches: number; avgOverall: number | null }[];
    total: number;
  }

  /** Agent A breaches once; Agent B is clean, so B ranks above A on score. */
  async function scoreTwoAgents() {
    const a = await uploadCall(fx.agentA);
    await processCall(a, "guaranteed returns", { guaranteed_returns: ["breach", [0]] });
    const b = await uploadCall(fx.agentB);
    await processCall(b, "Hello there.", {});
  }

  it("ranks agents by average score, with search, paging and a total", async () => {
    await scoreTwoAgents();
    const manager = await auth(fx.users.manager);

    const ranked = await request(ctx.app)
      .get("/api/dashboard/leaderboard?groupBy=agent&sort=avgScore&dir=desc")
      .set(manager)
      .expect(200);
    const secondPage = await request(ctx.app)
      .get("/api/dashboard/leaderboard?groupBy=agent&sort=avgScore&dir=desc&limit=1&page=2")
      .set(manager)
      .expect(200);
    const searched = await request(ctx.app)
      .get("/api/dashboard/leaderboard?groupBy=agent&q=agent%20b")
      .set(manager)
      .expect(200);

    expect((ranked.body as Board).items.map((r) => [r.name, r.breaches])).toEqual([
      ["Agent B", 0],
      ["Agent A", 1],
    ]);
    expect(secondPage.body as Board).toMatchObject({ total: 2, items: [{ name: "Agent A" }] });
    expect(searched.body as Board).toMatchObject({ total: 1, items: [{ name: "Agent B" }] });
  });

  it("leaves out groups below the minimum calls, and keeps them all at zero", async () => {
    const a = await uploadCall(fx.agentA);
    await processCall(a, "Hello there.", {});
    const manager = await auth(fx.users.manager);

    const active = await request(ctx.app)
      .get("/api/dashboard/leaderboard?groupBy=agent&sort=name&dir=asc")
      .set(manager)
      .expect(200);
    const everyone = await request(ctx.app)
      .get("/api/dashboard/leaderboard?groupBy=agent&sort=name&dir=asc&minCalls=0")
      .set(manager)
      .expect(200);

    expect((active.body as Board).items.map((r) => r.name)).toEqual(["Agent A"]);
    expect((everyone.body as Board).items.map((r) => r.name)).toEqual(["Agent A", "Agent B"]);
  });

  it("refuses an unknown sort column and anyone but a manager", async () => {
    await request(ctx.app)
      .get("/api/dashboard/leaderboard?sort=overall_score;drop")
      .set(await auth(fx.users.manager))
      .expect(400);
    await request(ctx.app)
      .get("/api/dashboard/leaderboard")
      .set(await auth(fx.users.qa))
      .expect(403);
    await request(ctx.app)
      .get("/api/dashboard/highlights")
      .set(await auth(fx.users.agentA))
      .expect(403);
  });

  it("sums up the period against the one before it and names the most failed items", async () => {
    await scoreTwoAgents();
    const manager = await auth(fx.users.manager);

    const october = await request(ctx.app)
      .get("/api/dashboard/highlights?from=2026-10-01&to=2026-10-31")
      .set(manager)
      .expect(200);
    const later = await request(ctx.app)
      .get("/api/dashboard/highlights?from=2026-10-02&to=2026-10-31")
      .set(manager)
      .expect(200);

    expect(october.body).toMatchObject({
      previousFrom: "2026-08-31",
      previousTo: "2026-09-30",
      kpis: {
        callsScored: { value: 2, previous: 0 },
        breaches: { value: 1, previous: 0 },
        flagRate: { value: 0.5, previous: null },
        reviewBacklog: 1,
      },
      failedItems: [{ key: "guaranteed_returns", failed: 1, applicable: 2, failRate: 0.5 }],
      languageMix: [{ name: "en-IN", calls: 2 }],
      productMix: [{ name: "ULIP", calls: 2 }],
    });
    expect(later.body).toMatchObject({
      kpis: { callsScored: { value: 0, previous: 2 }, avgScore: { value: null } },
    });
  });

  it("ranks top agents only once they have three scored calls", async () => {
    for (const line of ["Hello.", "Hello again.", "Hello once more."]) {
      const id = await uploadCall(fx.agentA);
      await processCall(id, line, {});
    }
    const b = await uploadCall(fx.agentB);
    await processCall(b, "Hello there.", {});

    const res = await request(ctx.app)
      .get("/api/dashboard/highlights?from=2026-10-01&to=2026-10-31")
      .set(await auth(fx.users.manager))
      .expect(200);

    const body = res.body as { topAgents: { name: string; callsScored: number }[] };
    expect(body.topAgents).toEqual([expect.objectContaining({ name: "Agent A", callsScored: 3 })]);
  });
});

describe("rubric and usage (US-01-004, US-02-001)", () => {
  it("returns model spend per day and purpose for the days asked, to managers only", async () => {
    await pool.query(
      `INSERT INTO model_calls (provider, model, kind, purpose, status, cost_usd, audio_seconds, created_at)
       VALUES ('groq', 'whisper-large-v3', 'stt', 'transcribe', 'ok', 0.002, 30, now()),
              ('groq', 'whisper-large-v3', 'stt', 'transcribe', 'ok', 0.001, 10, now()),
              ('groq', 'openai/gpt-oss-120b', 'chat', 'score', 'refused', 0, 0, now()),
              ('groq', 'openai/gpt-oss-120b', 'chat', 'score', 'ok', 0.5, 0, now() - interval '40 days')`,
    );

    const res = await request(ctx.app)
      .get("/api/usage/history?days=7")
      .set(await auth(fx.users.manager))
      .expect(200);

    const body = res.body as {
      days: {
        purpose: string;
        calls: number;
        costUsd: number;
        audioSeconds: number;
        refused: number;
      }[];
    };
    expect(body.days).toEqual([
      expect.objectContaining({ purpose: "score", calls: 1, costUsd: 0, refused: 1 }),
      expect.objectContaining({
        purpose: "transcribe",
        calls: 2,
        costUsd: 0.003,
        audioSeconds: 40,
      }),
    ]);
    await request(ctx.app)
      .get("/api/usage/history")
      .set(await auth(fx.users.qa))
      .expect(403);
  });

  it("saves a new active version that only managers may write", async () => {
    const items = DEFAULT_RUBRIC.slice(0, 3);
    await request(ctx.app)
      .post("/api/rubrics")
      .set(await auth(fx.users.qa))
      .send({ name: "x", items })
      .expect(403);

    const res = await request(ctx.app)
      .post("/api/rubrics")
      .set(await auth(fx.users.manager))
      .send({ name: "Shorter", items })
      .expect(201);

    expect(res.body).toMatchObject({ version: 2, isActive: true });
    const active = await request(ctx.app)
      .get("/api/rubrics/active")
      .set(await auth(fx.users.agentA))
      .expect(200);
    expect((active.body as { version: number }).version).toBe(2);
  });

  it("reports this month's spend against the budget", async () => {
    const callId = await uploadCall();
    await processCall(callId, "Hello.", {});

    const res = await request(ctx.app)
      .get("/api/usage")
      .set(await auth(fx.users.manager))
      .expect(200);

    const usage = res.body as {
      budgetUsd: number;
      spentUsd: number;
      byPurpose: { purpose: string }[];
    };
    expect(usage.budgetUsd).toBe(5);
    expect(usage.spentUsd).toBeGreaterThan(0);
    expect(usage.byPurpose.map((p) => p.purpose).sort()).toEqual(["score", "transcribe"]);
  });
});

describe("purge (US-02-003)", () => {
  it("deletes audio past retention and keeps the transcript", async () => {
    const callId = await uploadCall();
    await processCall(callId, "Hello.", {});
    await pool.query("UPDATE calls SET retention_until = current_date - 1 WHERE id = $1", [callId]);
    const storage = ctx.storage;

    const result = await handlePurge({
      pool,
      storage,
      gateway: fakeGateway(pool, {}).gateway,
      enqueue: recordingQueue().enqueue,
      log,
    });

    expect(result.purged).toBe(1);
    expect(storage.objects.size).toBe(0);
    const row = await pool.query<{ storage_path: string | null }>(
      "SELECT storage_path FROM calls WHERE id = $1",
      [callId],
    );
    expect(row.rows[0]!.storage_path).toBeNull();
    const segs = await pool.query("SELECT 1 FROM transcript_segments WHERE call_id = $1", [callId]);
    expect(segs.rowCount).toBeGreaterThan(0);
    await request(ctx.app)
      .post(`/api/calls/${callId}/audio-url`)
      .set(await auth(fx.users.qa))
      .expect(410);
  });
});
