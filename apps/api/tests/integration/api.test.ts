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
import { encodeWav } from "../../src/audio/wav.ts";
import type { Pool } from "../../src/db/pool.ts";
import { handlePurge, handleScore, handleTranscribe } from "../../src/jobs/handlers.ts";

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
async function uploadCall(agentId = fx.agentA): Promise<string> {
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

const sttBody = (text: string) => ({
  text,
  language: "english",
  duration: 2,
  segments: [
    { start: 0.1, end: 0.9, text, avg_logprob: -0.2, no_speech_prob: 0.01 },
    { start: 1.0, end: 1.9, text: "Is that clear?", avg_logprob: -0.2, no_speech_prob: 0.01 },
  ],
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
    expect(ctx.queue.sent).toEqual([{ queue: "transcribe", callId, startAfterSeconds: undefined }]);
  });

  it("refuses 11 files, a file over 50 MB and a non-audio type", async () => {
    const headers = await auth(fx.users.qa);
    const file = { name: "a.wav", type: "audio/wav", size: 1000 };
    await request(ctx.app)
      .post("/api/uploads/sign")
      .set(headers)
      .send({ files: Array(11).fill(file) })
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

  it("enables row level security on every app table", async () => {
    const { rows } = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      "SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'",
    );

    expect(rows.filter((r) => !r.relrowsecurity)).toEqual([]);
  });
});

describe("pipeline jobs (US-01-002, US-01-003, US-01-005)", () => {
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
});

describe("rubric and usage (US-01-004, US-02-001)", () => {
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
