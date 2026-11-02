import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type Fixture,
  fakeGateway,
  judgeBody,
  log,
  recordingQueue,
  resetData,
  resetDemo,
  seedFixture,
  testApp,
  testDemo,
  testDemoPool,
  testPool,
} from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";
import { demoEnqueue, demoStorage } from "../../src/demo/scoped.ts";
import type { JobMessage } from "../../src/jobs/bus.ts";
import { runPipelineJob } from "../../src/jobs/drain.ts";
import type { JobDeps } from "../../src/jobs/handlers.ts";
import { QUEUES } from "../../src/jobs/queue.ts";
import { republishWaiting } from "../../src/jobs/sweep.ts";

// Demo jobs run on the demo schema (ADR-0033): the same handlers, given the
// demo's dependencies because the job says it belongs to the demo.

let pool: Pool;
let demo: Pool;
let shadow: Fixture;
let ctx: Awaited<ReturnType<typeof testApp>>;

beforeAll(async () => {
  pool = await testPool();
  demo = await testDemoPool(pool);
});
afterAll(async () => {
  await demo.end();
  await pool.end();
});
beforeEach(async () => {
  await resetData(pool);
  await resetDemo(demo);
  await seedFixture(pool);
  shadow = await seedFixture(demo);
  ctx = await testApp(pool, { demo: testDemo(demo) });
});

async function demoUpload(): Promise<string> {
  const started = await request(ctx.app).post("/api/demo/sessions").send({});
  const { token } = started.body as { token: string };
  const res = await request(ctx.app)
    .post("/api/uploads/transcripts")
    .set("Authorization", `Bearer ${token}`)
    .send({
      transcripts: [
        {
          originalFilename: "mine.txt",
          agentId: shadow.agentA,
          teamId: shadow.teamId,
          productId: shadow.productId,
          callDate: "2026-10-22",
          lines: [
            { speaker: "agent", text: "Good morning, this is Ravi from Suraksha." },
            { speaker: "customer", text: "Hi, go on." },
          ],
        },
      ],
    });
  expect(res.status).toBe(201);
  return (res.body as { callIds: string[] }).callIds[0]!;
}

function deps(withDemo: boolean) {
  const queue = recordingQueue();
  const gateway = (p: Pool) =>
    fakeGateway(p, {
      stt: () => {
        throw new Error("speech-to-text must not run for a transcript");
      },
      chat: () => judgeBody(),
    }).gateway;
  const main: JobDeps = {
    pool,
    storage: ctx.storage,
    gateway: gateway(pool),
    enqueue: queue.enqueue,
    log,
  };
  return {
    queue,
    deps: withDemo
      ? {
          ...main,
          demo: {
            pool: demo,
            storage: demoStorage(ctx.storage),
            gateway: gateway(demo),
            enqueue: demoEnqueue(queue.enqueue),
            log,
          },
        }
      : main,
  };
}

const count = async (db: Pool, table: string) =>
  (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`)).rows[0]?.n;

describe("demo jobs", () => {
  it("score a demo call in the demo schema and queue their next step for the demo", async () => {
    const callId = await demoUpload();
    const { deps: d, queue } = deps(true);
    const message = { v: 1 as const, callId, workspace: "demo" as const };

    await runPipelineJob(d, QUEUES.transcribe, { id: "1", attempt: 0, message });
    await runPipelineJob(d, QUEUES.score, { id: "2", attempt: 0, message });

    expect(queue.sent.map((j) => [j.queue, j.workspace])).toEqual([["score", "demo"]]);
    expect([await count(demo, "scores"), await count(pool, "scores")]).toEqual([1, 0]);
    expect([await count(demo, "model_calls"), await count(pool, "model_calls")]).toEqual([1, 0]);
    const status = await demo.query<{ status: string }>("SELECT status FROM calls WHERE id = $1", [
      callId,
    ]);
    expect(status.rows[0]?.status).toBe("scored");
  });

  it("are acknowledged and left alone where demo mode is off", async () => {
    const callId = await demoUpload();
    const { deps: d } = deps(false);
    const message = { v: 1 as const, callId, workspace: "demo" as const };

    await expect(
      runPipelineJob(d, QUEUES.transcribe, { id: "1", attempt: 0, message }),
    ).resolves.toBeUndefined();
    const status = await demo.query<{ status: string }>("SELECT status FROM calls WHERE id = $1", [
      callId,
    ]);
    expect(status.rows[0]?.status).toBe("uploaded");
  });

  it("are republished by the sweep with their workspace", async () => {
    const callId = await demoUpload();
    await demo.query(
      "UPDATE calls SET updated_at = now() - interval '1 hour', created_at = now() - interval '1 hour'",
    );
    const published: ({ topic: string } & JobMessage)[] = [];
    const bus = {
      publish: (topic: string, message: JobMessage) => {
        published.push({ topic, ...message });
        return Promise.resolve();
      },
    };

    await republishWaiting({ pool, demoPool: demo, bus, log });

    expect(published).toEqual([{ topic: "transcribe", callId, workspace: "demo" }]);
  });
});
