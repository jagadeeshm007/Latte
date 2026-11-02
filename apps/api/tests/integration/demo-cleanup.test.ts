import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type Fixture,
  fakeGateway,
  insertScoredCall,
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
import { demoJobDeps } from "../../src/demo/scoped.ts";
import { handlePurge, type JobDeps } from "../../src/jobs/handlers.ts";

// The daily purge clears the demo's expired visitors and old counters, and
// the real purge never touches the demo's objects (ADR-0033).

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

async function visitorWithUpload(ip: string): Promise<string> {
  const started = await request(ctx.app)
    .post("/api/demo/sessions")
    .set("x-forwarded-for", ip)
    .send({});
  const { token } = started.body as { token: string };
  const me = await request(ctx.app).get("/api/me").set("Authorization", `Bearer ${token}`);
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
          lines: [{ speaker: "agent", text: "Hello." }],
        },
      ],
    });
  expect(res.status).toBe(201);
  return (me.body as { id: string }).id;
}

function jobDeps(): JobDeps {
  const main: JobDeps = {
    pool,
    storage: ctx.storage,
    gateway: fakeGateway(pool, {}).gateway,
    enqueue: recordingQueue().enqueue,
    log,
  };
  return { ...main, demo: demoJobDeps(main, demo, fakeGateway(demo, {}).gateway) };
}

const ids = async (table: string) =>
  (await demo.query<{ id: string }>(`SELECT id::text FROM ${table} ORDER BY 1`)).rows.map(
    (r) => r.id,
  );

describe("the demo purge", () => {
  it("removes expired visitors with everything they made and keeps the rest", async () => {
    const gone = await visitorWithUpload("192.0.2.1");
    const stays = await visitorWithUpload("192.0.2.2");
    const seeded = await insertScoredCall(demo, shadow, { callDate: "2026-10-01" });
    await demo.query("UPDATE visitors SET expires_at = now() - interval '1 minute' WHERE id = $1", [
      gone,
    ]);

    await handlePurge(jobDeps());

    expect(await ids("visitors")).toEqual([stays]);
    const profiles = await ids("profiles");
    expect(profiles).toContain(stays);
    expect(profiles).not.toContain(gone);
    const uploaders = await demo.query<{ uploaded_by: string; id: string }>(
      "SELECT uploaded_by::text, id::text FROM calls",
    );
    expect(uploaders.rows.map((r) => r.uploaded_by)).not.toContain(gone);
    expect(uploaders.rows.map((r) => r.id)).toContain(seeded);
    expect(uploaders.rows.some((r) => r.uploaded_by === stays)).toBe(true);
  });

  it("forgets devices after 7 days, daily counts after 30 and session counts after 2", async () => {
    await demo.query(
      `INSERT INTO device_uploads (fingerprint_hash, uploaded_at) VALUES
         (repeat('a', 64), now() - interval '8 days'), (repeat('b', 64), now() - interval '1 day');
       INSERT INTO daily_uploads (day, uploads) VALUES (current_date - 31, 5), (current_date - 1, 5);
       INSERT INTO session_starts (ip_hash, hour, starts) VALUES
         (repeat('c', 64), now() - interval '3 days', 1), (repeat('d', 64), now(), 1);`,
    );

    await handlePurge(jobDeps());

    const devices = await demo.query<{ h: string }>(
      "SELECT left(fingerprint_hash, 1) AS h FROM device_uploads",
    );
    const days = await demo.query<{ n: number }>("SELECT count(*)::int AS n FROM daily_uploads");
    const starts = await demo.query<{ h: string }>(
      "SELECT left(ip_hash, 1) AS h FROM session_starts",
    );
    expect(devices.rows).toEqual([{ h: "b" }]);
    expect(days.rows[0]).toEqual({ n: 1 });
    expect(starts.rows).toEqual([{ h: "d" }]);
  });

  it("leaves the demo's objects out of the real purge's orphan sweep", async () => {
    ctx.storage.objects.set("demo/seed/call-01.wav", new Uint8Array([1]));
    ctx.storage.objects.set("someone/orphan.wav", new Uint8Array([1]));

    const { demo: _demo, ...realOnly } = jobDeps();
    await handlePurge(realOnly);

    expect([...ctx.storage.objects.keys()]).toEqual(["demo/seed/call-01.wav"]);
  });
});
