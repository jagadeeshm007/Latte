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
import {
  handlePurge,
  handleScore,
  handleTranscribe,
  MAX_RESCHEDULES,
} from "../../src/jobs/handlers.ts";
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
    `WITH b AS (INSERT INTO batches (name, created_by) VALUES ('Edge batch', $4) RETURNING id)
     INSERT INTO calls (agent_id, team_id, product_id, call_date, batch_id, uploaded_by, original_filename, mime_type,
                        size_bytes, storage_path, status, error, retention_until, created_at)
     SELECT $1, $2, $3, '2026-10-01', b.id, $4, 'c.wav', 'audio/wav', 10, $5, $6::call_status,
             CASE WHEN $6::text = 'failed' THEN 'boom' END, current_date + 90, ${createdAt}
       FROM b
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
    await pool.query(
      `INSERT INTO scores (call_id, rubric_id, overall_score, judge_status, talk_ratio, needs_review, review_status)
       SELECT $1, id, 50, 'ok', 0.5, true, 'pending' FROM rubrics WHERE is_active`,
      [callId],
    );
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
      .expect(201);
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

describe("security review fixes", () => {
  async function signed(user: string) {
    const res = await request(ctx.app)
      .post("/api/uploads/sign")
      .set(await auth(user))
      .send({ files: [{ name: "a.wav", type: "audio/wav", size: 100 }] })
      .expect(200);
    const path = (res.body as { uploads: { path: string }[] }).uploads[0]!.path;
    ctx.storage.objects.set(path, new Uint8Array([1]));
    return path;
  }
  const file = (path: string) => ({
    path,
    originalFilename: "a.wav",
    mimeType: "audio/wav",
    sizeBytes: 100,
    agentId: fx.agentA,
    teamId: fx.teamId,
    productId: fx.productId,
    callDate: "2026-10-01",
  });

  it("confirms an uploaded file once: a repeat answers 409 and creates no second call", async () => {
    const path = await signed(fx.users.qa);
    const headers = await auth(fx.users.qa);

    await request(ctx.app)
      .post("/api/uploads/confirm")
      .set(headers)
      .send({ files: [file(path)] })
      .expect(201);
    await request(ctx.app)
      .post("/api/uploads/confirm")
      .set(headers)
      .send({ files: [file(path)] })
      .expect(409);
    await request(ctx.app)
      .post("/api/uploads/confirm")
      .set(headers)
      .send({ files: [file(path), file(path)] })
      .expect(409);

    const n = await pool.query("SELECT 1 FROM calls WHERE storage_path = $1", [path]);
    expect(n.rowCount).toBe(1);
  });

  it("refuses a path that only starts with the caller's id", async () => {
    await request(ctx.app)
      .post("/api/uploads/confirm")
      .set(await auth(fx.users.qa))
      .send({ files: [file(`${fx.users.qa}/../${fx.users.manager}/x.wav`)] })
      .expect(403);
  });

  it("queues a retry once when two reviewers press it together, and audits it", async () => {
    const callId = await insertCall("failed");
    const headers = await auth(fx.users.qa);

    const results = await Promise.all([
      request(ctx.app).post(`/api/calls/${callId}/retry`).set(headers),
      request(ctx.app).post(`/api/calls/${callId}/retry`).set(headers),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([202, 409]);
    expect(ctx.queue.sent).toHaveLength(1);
    const audit = await pool.query(
      "SELECT 1 FROM audit_events WHERE action = 'call_retried' AND call_id = $1",
      [callId],
    );
    expect(audit.rowCount).toBe(1);
  });

  it("lets a call stuck in the pipeline be retried and marks long-stuck calls failed in the purge", async () => {
    const stuck = await insertCall("transcribing");
    await pool.query("UPDATE calls SET updated_at = now() - interval '3 hours' WHERE id = $1", [
      stuck,
    ]);

    await handlePurge({
      pool,
      storage: ctx.storage,
      gateway: fakeGateway(pool, {}).gateway,
      enqueue: recordingQueue().enqueue,
      log,
    });

    const row = await pool.query<{ status: string }>("SELECT status FROM calls WHERE id = $1", [
      stuck,
    ]);
    expect(row.rows[0]!.status).toBe("failed");
    await request(ctx.app)
      .post(`/api/calls/${stuck}/retry`)
      .set(await auth(fx.users.qa))
      .expect(202);
  });

  it("fails a call after too many rate-limit reschedules", async () => {
    const callId = await insertCall();
    const path = (
      await pool.query<{ storage_path: string }>("SELECT storage_path FROM calls WHERE id = $1", [
        callId,
      ])
    ).rows[0]!.storage_path;
    const { encodeWav } = await import("../../src/audio/wav.ts");
    const tone = new Float32Array(32_000).map((_, i) => 0.4 * Math.sin(i / 3));
    ctx.storage.objects.set(path, encodeWav([tone, tone], 16_000));
    const { gateway, fetch } = fakeGateway(pool, {});
    fetch.mockImplementation(() =>
      Promise.resolve(new Response("slow", { status: 429, headers: { "retry-after": "5" } })),
    );

    await handleTranscribe(deps(gateway), { callId, retryCount: 0, reschedules: MAX_RESCHEDULES });

    const row = await pool.query<{ status: string; error: string }>(
      "SELECT status, error FROM calls WHERE id = $1",
      [callId],
    );
    expect(row.rows[0]).toMatchObject({ status: "failed" });
    expect(row.rows[0]!.error).toContain("rate limiting");
  });

  it("audits every review decision and rescores the call from the decisions when the review completes", async () => {
    const callId = await insertCall("scored");
    const scoreId = (
      await pool.query<{ id: string }>(
        `INSERT INTO scores (call_id, rubric_id, overall_score, judge_status, talk_ratio, needs_review, review_status)
         SELECT $1, id, 0, 'ok', 0.5, true, 'pending' FROM rubrics WHERE is_active RETURNING id`,
        [callId],
      )
    ).rows[0]!.id;
    const insertFinding = async (key: string, type: string, status: string) =>
      (
        await pool.query<{ id: string }>(
          "INSERT INTO findings (score_id, call_id, item_key, item_type, status, source) VALUES ($1, $2, $3, $4, $5, 'rule') RETURNING id",
          [scoreId, callId, key, type, status],
        )
      ).rows[0]!.id;
    const breach = await insertFinding("guaranteed_returns", "prohibited", "breach");
    const greeting = await insertFinding("greeting", "mandatory", "met");
    const qa = await auth(fx.users.qa);

    await request(ctx.app)
      .put(`/api/findings/${breach}/review`)
      .set(qa)
      .send({ decision: "agree" })
      .expect(204);
    await request(ctx.app)
      .put(`/api/findings/${breach}/review`)
      .set(qa)
      .send({ decision: "disagree" })
      .expect(204);
    await request(ctx.app)
      .put(`/api/findings/${greeting}/review`)
      .set(qa)
      .send({ decision: "agree" })
      .expect(204);
    await request(ctx.app).post(`/api/calls/${callId}/review/complete`).set(qa).expect(204);

    const audits = await pool.query(
      "SELECT 1 FROM audit_events WHERE action = 'finding_decided' AND call_id = $1",
      [callId],
    );
    expect(audits.rowCount).toBe(3);
    const score = await pool.query<{ overall_score: number }>(
      "SELECT overall_score FROM scores WHERE call_id = $1",
      [callId],
    );
    // The rejected breach no longer zeroes the score; the agreed greeting is 100%.
    expect(score.rows[0]!.overall_score).toBe(100);
  });

  it("rate-limits repeated retries per user", async () => {
    const { perUserLimit } = await import("../../src/rate-limit.ts");
    let t = 0;
    const limit = perUserLimit("retry", 2, 1000, () => t);
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    };
    const call = () =>
      new Promise<unknown>((resolve) => {
        try {
          limit({ user: { id: "u" } } as never, res as never, () => {
            resolve("ok");
          });
        } catch (error) {
          resolve(error);
        }
      });

    expect(await call()).toBe("ok");
    expect(await call()).toBe("ok");
    expect(await call()).toMatchObject({ statusCode: 429 });
    expect(headers["Retry-After"]).toBe("1");
    t = 2000;
    expect(await call()).toBe("ok");
  });
});
