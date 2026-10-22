import { readFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_RUBRIC } from "@scc/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type Fixture,
  fakeGateway,
  insertScoredCall,
  log,
  recordingQueue,
  resetData,
  seedFixture,
  testApp,
  testPool,
} from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";
import { handleScore, handleTranscribe } from "../../src/jobs/handlers.ts";
import { requeueForRetry } from "../../src/repo/calls.ts";

// Calls uploaded as transcripts, with no audio, and the batch-finished notice (ADR-0030).

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

const transcript = (over: Record<string, unknown> = {}) => ({
  originalFilename: "call-01.txt",
  agentId: fx.agentA,
  teamId: fx.teamId,
  productId: fx.productId,
  callDate: "2026-10-22",
  lines: [
    { speaker: "agent", text: "Good morning, this is Ravi from Suraksha." },
    { speaker: "customer", text: "Hi, go on." },
  ],
  ...over,
});

const upload = async (body: Record<string, unknown>, sub = fx.users.qa) =>
  request(ctx.app)
    .post("/api/uploads/transcripts")
    .set(await auth(sub))
    .send(body);

/** Uploads and expects the calls to be created. */
async function uploadOk(body: Record<string, unknown>) {
  const res = await upload(body);
  expect(res.status).toBe(201);
  return res;
}

/** A judge answer that meets every item, citing the first line. */
function judgeBody() {
  return {
    choices: [
      {
        finish_reason: "stop",
        message: {
          content: JSON.stringify({
            items: DEFAULT_RUBRIC.map((i) => ({
              key: i.key,
              status: i.type === "prohibited" ? "clear" : "met",
              segments: i.type === "prohibited" ? [] : [0],
              note: "because",
            })),
            coaching: ["Keep it up."],
          }),
        },
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 50 },
  };
}

/** Runs the pipeline with a gateway that refuses speech-to-text: a transcript never needs it. */
async function process(callId: string, translate?: (body: Record<string, unknown>) => unknown) {
  const { gateway } = fakeGateway(pool, {
    stt: () => {
      throw new Error("speech-to-text must not run for a transcript");
    },
    chat: () => judgeBody(),
    ...(translate ? { translate } : {}),
  });
  const deps = { pool, storage: ctx.storage, gateway, enqueue: recordingQueue().enqueue, log };
  await handleTranscribe(deps, { callId, retryCount: 0 });
  await handleScore(deps, { callId, retryCount: 0 });
}

describe("transcript uploads", () => {
  it("creates calls with no audio, keeps given times, and queues them like audio", async () => {
    const res = await uploadOk({
      batchName: "From the dialler",
      transcripts: [
        transcript(),
        transcript({
          originalFilename: "call-02.json",
          lines: [
            { speaker: "customer", text: "Hello?", startMs: 4000, endMs: 5000 },
            { speaker: "agent", text: "Hi, Ravi here.", startMs: 0, endMs: 3000 },
          ],
        }),
      ],
    });

    const { callIds } = res.body as { callIds: string[] };
    const { rows } = await pool.query<{
      input: string;
      timed: boolean;
      storage_path: string | null;
      mime_type: string;
      duration_ms: number | null;
    }>(
      "SELECT input, timed, storage_path, mime_type, duration_ms FROM calls WHERE id = ANY($1) ORDER BY original_filename",
      [callIds],
    );
    const firstLines = await pool.query<{ channel: string; text: string }>(
      "SELECT channel, text FROM transcript_segments WHERE call_id = $1 ORDER BY seq",
      [callIds[1]],
    );
    expect(rows).toEqual([
      {
        input: "transcript",
        timed: false,
        storage_path: null,
        mime_type: "text/plain",
        duration_ms: null,
      },
      {
        input: "transcript",
        timed: true,
        storage_path: null,
        mime_type: "application/json",
        duration_ms: 5000,
      },
    ]);
    expect(firstLines.rows.map((r) => r.channel)).toEqual(["agent", "customer"]);
    expect(ctx.queue.sent.map((j) => j.queue)).toEqual(["transcribe", "transcribe"]);
  });

  it("refuses mixed times, an undetectable language, an unknown agent and an agent's upload", async () => {
    const mixed = await upload({
      transcripts: [
        transcript({
          lines: [
            { speaker: "agent", text: "Hi", startMs: 0, endMs: 900 },
            { speaker: "customer", text: "Hello" },
          ],
        }),
      ],
    });
    const auto = await upload({ transcripts: [transcript({ language: "auto" })] });
    const unknown = await upload({
      transcripts: [transcript({ agentId: "00000000-0000-4000-8000-000000000009" })],
    });
    const byAgent = await upload({ transcripts: [transcript()] }, fx.users.agentA);

    expect([mixed.status, auto.status, unknown.status, byAgent.status]).toEqual([
      400, 400, 400, 403,
    ]);
    expect(JSON.stringify(mixed.body)).toContain("give times on every line, or on none");
  });

  it("scores a transcript without speech-to-text and tells the uploader the batch finished", async () => {
    const res = await uploadOk({ batchName: "Imported", transcripts: [transcript()] });
    const { batchId, callIds } = res.body as { batchId: string; callIds: string[] };

    await process(callIds[0]!);

    const detail = await request(ctx.app)
      .get(`/api/calls/${callIds[0]!}`)
      .set(await auth(fx.users.qa))
      .expect(200);
    const inbox = await request(ctx.app)
      .get("/api/notifications")
      .set(await auth(fx.users.qa))
      .expect(200);
    const body = detail.body as {
      call: { status: string; input: string; timed: boolean };
      audioAvailable: boolean;
    };
    expect(body.call).toMatchObject({ status: "scored", input: "transcript", timed: false });
    expect(body.audioAvailable).toBe(false);
    expect((inbox.body as { items: unknown[] }).items).toEqual([
      expect.objectContaining({
        kind: "batch",
        title: 'Batch "Imported" finished',
        body: "All 1 calls scored.",
        link: `/batches/${batchId}`,
      }),
    ]);
  });

  it("translates a regional transcript before scoring it", async () => {
    const res = await uploadOk({
      transcripts: [
        transcript({
          language: "hi-IN",
          lines: [{ speaker: "agent", text: "नमस्ते, मैं रवि बोल रहा हूँ।" }],
        }),
      ],
    });
    const callId = (res.body as { callIds: string[] }).callIds[0]!;

    await process(callId, () => ({
      translated_text: "Hello, this is Ravi speaking.",
      source_language_code: "hi-IN",
    }));

    const { rows } = await pool.query<{ text_en: string | null; status: string }>(
      "SELECT t.text_en, c.status FROM transcript_segments t JOIN calls c ON c.id = t.call_id WHERE t.call_id = $1",
      [callId],
    );
    expect(rows).toEqual([{ text_en: "Hello, this is Ravi speaking.", status: "scored" }]);
  });

  // SCC-1: a transcript has lines from the start, so retry must not skip its translation.
  it("sends a failed transcript back to the prepare step on retry, not straight to scoring", async () => {
    const res = await uploadOk({ transcripts: [transcript({ language: "hi-IN" })] });
    const callId = (res.body as { callIds: string[] }).callIds[0]!;
    await pool.query(
      "UPDATE calls SET status = 'failed', error = 'translation failed' WHERE id = $1",
      [callId],
    );

    const step = await requeueForRetry(pool, callId, 60);

    expect(step).toBe("transcribe");
  });

  it("does not bill a transcript's length as audio", async () => {
    const id = await insertScoredCall(pool, fx, { callDate: "2026-10-05" });
    await pool.query(
      `UPDATE calls SET input = 'transcript', timed = true, storage_path = NULL,
              mime_type = 'text/plain', size_bytes = 100, duration_ms = 120000 WHERE id = $1`,
      [id],
    );
    await pool.query(
      "UPDATE scores SET created_at = '2026-10-05'::date + interval '12 hours' WHERE call_id = $1",
      [id],
    );

    const res = await request(ctx.app)
      .get("/api/billing/statement?month=2026-10")
      .set(await auth(fx.users.manager))
      .expect(200);

    expect(
      (res.body as { lines: { label: string; quantity: number }[] }).lines.slice(0, 2),
    ).toEqual([
      expect.objectContaining({ label: "Calls scored", quantity: 1 }),
      expect.objectContaining({ label: "Audio processed", quantity: 0 }),
    ]);
  });
});

describe("migration 0014", () => {
  it("reverses with its down file and applies again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0014_transcript_upload.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0014_transcript_upload.sql"), "utf8");
    const columns = async (client: { query: Pool["query"] }) =>
      (
        await client.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
            WHERE table_name = 'calls' AND column_name IN ('input', 'timed') ORDER BY 1`,
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

      expect([afterDown, afterUp]).toEqual([[], ["input", "timed"]]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
