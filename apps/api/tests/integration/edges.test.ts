import { DEFAULT_RUBRIC } from "@scc/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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
import type { Pool } from "../../src/db/pool.ts";
import { handleScore, handleTranscribe } from "../../src/jobs/handlers.ts";
import { RETRY_LIMIT } from "../../src/jobs/queue.ts";


// Edge paths: failures, retries, validation, paging and CORS.

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

async function insertCall(status = "uploaded", createdAt = "now()"): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO calls (agent_id, team_id, product_id, call_date, batch_id, uploaded_by, original_filename, mime_type,
                        size_bytes, storage_path, status, error, retention_until, created_at)
     VALUES ($1, $2, $3, '2026-10-01', gen_random_uuid(), $4, 'c.wav', 'audio/wav', 10, $5, $6::call_status,
             CASE WHEN $6::text = 'failed' THEN 'boom' END, current_date + 90, ${createdAt})
     RETURNING id`,
    [
      fx.agentA,
      fx.teamId,
      fx.productId,
      fx.users.qa,
      `${fx.users.qa}/${String(Math.random())}.wav`,
      status,
    ],
  );
  return rows[0]!.id;
}

const deps = (gateway = fakeGateway(pool, {}).gateway, queue = recordingQueue()) => ({
  pool,
  storage: ctx.storage,
  gateway,
  enqueue: queue.enqueue,
  log,
});

describe("job failures", () => {
  it("fails a call whose audio is gone", async () => {
    const callId = await insertCall();
    await pool.query("UPDATE calls SET storage_path = NULL WHERE id = $1", [callId]);

    await handleTranscribe(deps(), { callId, retryCount: 0 });

    const row = await pool.query<{ error: string }>("SELECT error FROM calls WHERE id = $1", [
      callId,
    ]);
    expect(row.rows[0]!.error).toBe("Recording audio is no longer stored");
  });

  it("rethrows an unexpected error so pg-boss retries, then fails the call on the last attempt", async () => {
    const callId = await insertCall();

    await expect(handleTranscribe(deps(), { callId, retryCount: 0 })).rejects.toThrow("missing");
    await handleTranscribe(deps(), { callId, retryCount: RETRY_LIMIT });

    const row = await pool.query<{ status: string; error: string }>(
      "SELECT status, error FROM calls WHERE id = $1",
      [callId],
    );
    expect(row.rows[0]).toEqual({
      status: "failed",
      error: "Transcription failed after several attempts; retry later",
    });
  });

  it("fails transcription with a readable reason when the budget is spent", async () => {
    const callId = await insertCall();
    const path = (
      await pool.query<{ storage_path: string }>("SELECT storage_path FROM calls WHERE id = $1", [
        callId,
      ])
    ).rows[0]!.storage_path;
    const { encodeWav } = await import("../../src/audio/wav.ts");
    const tone = new Float32Array(32_000).map((_, i) => 0.4 * Math.sin(i / 3));
    ctx.storage.objects.set(path, encodeWav([tone, tone], 16_000));
    await pool.query(
      "INSERT INTO model_calls (provider, model, kind, purpose, status, cost_usd) VALUES ('groq', 'm', 'chat', 'eval', 'ok', 10)",
    );

    await handleTranscribe(deps(), { callId, retryCount: 0 });

    const row = await pool.query<{ error: string }>("SELECT error FROM calls WHERE id = $1", [
      callId,
    ]);
    expect(row.rows[0]!.error).toContain("budget exhausted");
  });

  it("saves an unscored call to the QA queue when the judge is refused by the budget", async () => {
    const callId = await insertCall("transcribed");
    await pool.query(
      "INSERT INTO transcript_segments (call_id, seq, channel, start_ms, end_ms, text) VALUES ($1, 0, 'agent', 0, 1000, 'Pakka return milega sir')",
      [callId],
    );
    await pool.query(
      "INSERT INTO model_calls (provider, model, kind, purpose, status, cost_usd) VALUES ('groq', 'm', 'chat', 'eval', 'ok', 10)",
    );

    await handleScore(deps(), { callId, retryCount: 0 });

    const score = await pool.query<{ judge_status: string; review_status: string }>(
      "SELECT judge_status, review_status FROM scores WHERE call_id = $1",
      [callId],
    );
    expect(score.rows[0]).toEqual({ judge_status: "failed", review_status: "pending" });
    const rule = await pool.query("SELECT 1 FROM findings WHERE call_id = $1 AND source = 'rule'", [
      callId,
    ]);
    expect(rule.rowCount).toBe(1);
  });

  it("fails scoring with no active rubric after the last attempt", async () => {
    const callId = await insertCall("transcribed");
    await pool.query("UPDATE rubrics SET is_active = false");

    await handleScore(deps(), { callId, retryCount: RETRY_LIMIT });

    const row = await pool.query<{ status: string }>("SELECT status FROM calls WHERE id = $1", [
      callId,
    ]);
    expect(row.rows[0]!.status).toBe("failed");
  });
});

describe("retry endpoint", () => {
  it("requeues a failed call with no transcript for transcription", async () => {
    const callId = await insertCall("failed");

    await request(ctx.app)
      .post(`/api/calls/${callId}/retry`)
      .set(await auth(fx.users.qa))
      .expect(202);

    expect(ctx.queue.sent).toEqual([{ queue: "transcribe", callId, startAfterSeconds: undefined }]);
  });

  it("requeues a failed call that has a transcript for scoring", async () => {
    const callId = await insertCall("failed");
    await pool.query(
      "INSERT INTO transcript_segments (call_id, seq, channel, start_ms, end_ms, text) VALUES ($1, 0, 'agent', 0, 10, 'hi')",
      [callId],
    );

    await request(ctx.app)
      .post(`/api/calls/${callId}/retry`)
      .set(await auth(fx.users.qa))
      .expect(202);

    expect(ctx.queue.sent[0]!.queue).toBe("score");
  });

  it("refuses to retry a healthy call and an unknown one", async () => {
    const callId = await insertCall("uploaded");
    const headers = await auth(fx.users.qa);

    await request(ctx.app).post(`/api/calls/${callId}/retry`).set(headers).expect(409);
    await request(ctx.app)
      .post("/api/calls/00000000-0000-4000-8000-000000000000/retry")
      .set(headers)
      .expect(404);
  });
});

describe("listing and validation", () => {
  it("pages through calls newest first with a cursor and filters by status", async () => {
    const ids = [];
    for (let i = 0; i < 3; i++)
      ids.push(
        await insertCall(
          i === 0 ? "failed" : "uploaded",
          `now() - interval '${String(i)} minutes'`,
        ),
      );
    const headers = await auth(fx.users.manager);

    const first = await request(ctx.app).get("/api/calls?limit=2").set(headers).expect(200);
    const firstBody = first.body as { items: { id: string }[]; nextCursor: string };
    const second = await request(ctx.app)
      .get(`/api/calls?limit=2&cursor=${firstBody.nextCursor}`)
      .set(headers)
      .expect(200);
    const failed = await request(ctx.app)
      .get("/api/calls?status=failed&needsReview=false")
      .set(headers)
      .expect(200);

    expect(firstBody.items.map((c) => c.id)).toEqual(ids.slice(0, 2));
    expect(
      (second.body as { items: { id: string }[]; nextCursor: string | null }).items.map(
        (c) => c.id,
      ),
    ).toEqual([ids[2]]);
    expect((second.body as { nextCursor: string | null }).nextCursor).toBeNull();
    expect((failed.body as { items: { id: string }[] }).items.map((c) => c.id)).toEqual([ids[0]]);
  });

  it("answers 400 with the field name for a bad query or body, and 404 for an unknown route", async () => {
    const headers = await auth(fx.users.manager);

    const bad = await request(ctx.app).get("/api/calls?limit=1000").set(headers).expect(400);
    await request(ctx.app).get("/api/calls/not-a-uuid").set(headers).expect(400);
    await request(ctx.app)
      .post("/api/rubrics")
      .set(headers)
      .set("Content-Type", "application/json")
      .send("{bad json")
      .expect(400);
    await request(ctx.app).get("/api/nothing-here").set(headers).expect(404);

    expect((bad.body as { error: { code: string; message: string } }).error).toMatchObject({
      code: "validation_error",
    });
    expect((bad.body as { error: { message: string } }).error.message).toContain("limit");
  });

  it("refuses a missed finding with a status that does not fit the item, or an unknown line", async () => {
    const callId = await insertCall("scored");
    const headers = await auth(fx.users.qa);

    await request(ctx.app)
      .post(`/api/calls/${callId}/findings`)
      .set(headers)
      .send({ itemKey: "greeting", status: "breach" })
      .expect(400);
    await request(ctx.app)
      .post(`/api/calls/${callId}/findings`)
      .set(headers)
      .send({ itemKey: "nope", status: "met" })
      .expect(400);
    await request(ctx.app)
      .post(`/api/calls/${callId}/findings`)
      .set(headers)
      .send({ itemKey: "greeting", status: "missed", segmentSeq: 9 })
      .expect(400);
    await request(ctx.app)
      .post(`/api/calls/${callId}/findings`)
      .set(headers)
      .send({ itemKey: "greeting", status: "missed" })
      .expect(409);
  });

  it("lists rubric versions and the reference data", async () => {
    const res = await request(ctx.app)
      .get("/api/rubrics")
      .set(await auth(fx.users.qa))
      .expect(200);
    const ref = await request(ctx.app)
      .get("/api/reference")
      .set(await auth(fx.users.qa))
      .expect(200);

    expect((res.body as { items: { items: unknown[] }[] }).items[0]!.items).toHaveLength(
      DEFAULT_RUBRIC.length,
    );
    expect((ref.body as { agents: unknown[] }).agents).toHaveLength(2);
  });

  it("answers 404 for an unknown finding and agent scorecard", async () => {
    const headers = await auth(fx.users.qa);
    await request(ctx.app)
      .put("/api/findings/00000000-0000-4000-8000-000000000000/review")
      .set(headers)
      .send({ decision: "agree" })
      .expect(404);
    await request(ctx.app)
      .get("/api/scorecard/00000000-0000-4000-8000-000000000000")
      .set(headers)
      .expect(404);
    await request(ctx.app).get(`/api/scorecard/${fx.agentA}`).set(headers).expect(200);
  });
});

describe("CORS", () => {
  it("allows the web origin only and answers preflight", async () => {
    const ok = await request(ctx.app)
      .options("/api/calls")
      .set("Origin", "http://localhost:5173")
      .expect(204);
    const other = await request(ctx.app)
      .get("/api/health")
      .set("Origin", "https://evil.example")
      .expect(200);

    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
    expect(ok.headers["x-request-id"]).toBeTruthy();
  });

  it("echoes a safe incoming request id", async () => {
    const res = await request(ctx.app)
      .get("/api/health")
      .set("x-request-id", "abc-123")
      .expect(200);

    expect(res.headers["x-request-id"]).toBe("abc-123");
  });
});
