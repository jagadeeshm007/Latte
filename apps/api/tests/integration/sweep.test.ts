import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type Fixture, log, resetData, seedFixture, testPool } from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";
import type { JobBus } from "../../src/jobs/bus.ts";
import { republishWaiting } from "../../src/jobs/sweep.ts";

// SCC-4-2: with push delivery a publish lost after its call was saved leaves
// the call waiting forever, since no drain looks at the database. The sweep
// finds calls left waiting and publishes their next step again.

let pool: Pool;
let fx: Fixture;
beforeAll(async () => {
  pool = await testPool();
});
afterAll(async () => {
  await pool.end();
});
beforeEach(async () => {
  await resetData(pool);
  fx = await seedFixture(pool);
});

async function insertCall(status: string, minutesAgo: number, deleted = false): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `WITH b AS (INSERT INTO batches (name, created_by) VALUES ('Sweep batch', $4) RETURNING id)
     INSERT INTO calls (agent_id, team_id, product_id, call_date, batch_id, uploaded_by, original_filename, mime_type,
                        size_bytes, storage_path, status, retention_until, updated_at, deleted_at)
     SELECT $1, $2, $3, '2026-10-01', b.id, $4, 'c.wav', 'audio/wav', 10, $5, $6::call_status,
            current_date + 90, now() - make_interval(mins => $7), CASE WHEN $8 THEN now() END
       FROM b
     RETURNING id`,
    [
      fx.agentA,
      fx.teamId,
      fx.productId,
      fx.users.qa,
      `${fx.users.qa}/${String(Math.random())}.wav`,
      status,
      minutesAgo,
      deleted,
    ],
  );
  return rows[0]!.id;
}

function recordingBus() {
  const published: { topic: string; callId: string | undefined; key: string | undefined }[] = [];
  const bus: Pick<JobBus, "publish"> = {
    publish: (topic, message, options) => {
      published.push({ topic, callId: message.callId, key: options?.idempotencyKey });
      return Promise.resolve();
    },
  };
  return { published, bus };
}

describe("republishWaiting", () => {
  it("publishes the next step for calls waiting longer than the cutoff, and nothing else", async () => {
    const uploaded = await insertCall("uploaded", 30);
    const transcribed = await insertCall("transcribed", 30);
    await insertCall("uploaded", 1);
    await insertCall("transcribing", 30);
    await insertCall("scored", 30);
    await insertCall("uploaded", 30, true);
    const recorded = recordingBus();

    const result = await republishWaiting({ pool, bus: recorded.bus, log });

    expect(result).toEqual({ republished: 2 });
    expect(recorded.published.map(({ topic, callId }) => [topic, callId]).sort()).toEqual(
      [
        ["score", transcribed],
        ["transcribe", uploaded],
      ].sort(),
    );
  });

  it("keys each publish by the call, its step and when it last moved, so a second sweep is dropped", async () => {
    await insertCall("uploaded", 30);
    const first = recordingBus();
    const second = recordingBus();

    await republishWaiting({ pool, bus: first.bus, log });
    await republishWaiting({ pool, bus: second.bus, log });

    expect(first.published[0]?.key).toMatch(/^[0-9a-f-]{36}:transcribe:\d+$/);
    expect(second.published[0]?.key).toBe(first.published[0]?.key);
  });
});
