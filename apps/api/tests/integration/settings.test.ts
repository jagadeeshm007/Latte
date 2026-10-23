import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type Fixture, resetData, seedFixture, testApp, testPool } from "./helpers.ts";
import type { Pool } from "../../src/db/pool.ts";

// SCC-2-6: a person's own settings. PATCH /api/me changes only the caller's display name.

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

describe("PATCH /api/me", () => {
  it("lets any role rename themselves, trimmed, and records it", async () => {
    const agent = await auth(fx.users.agentA);

    const res = await request(ctx.app)
      .patch("/api/me")
      .set(agent)
      .send({ displayName: "  Ravi Kumar  " })
      .expect(200);

    expect(res.body).toMatchObject({
      id: fx.users.agentA,
      displayName: "Ravi Kumar",
      role: "agent",
    });
    const me = await request(ctx.app).get("/api/me").set(agent).expect(200);
    expect((me.body as { displayName: string }).displayName).toBe("Ravi Kumar");
    const audited = await pool.query(
      "SELECT 1 FROM audit_events WHERE actor_id = $1 AND action = 'member_updated'",
      [fx.users.agentA],
    );
    expect(audited.rowCount).toBe(1);
  });

  it("changes nothing but the name, even when the body asks for more", async () => {
    const res = await request(ctx.app)
      .patch("/api/me")
      .set(await auth(fx.users.agentA))
      .send({ displayName: "Agent A", role: "manager", email: "boss@example.com" })
      .expect(200);

    expect(res.body).toMatchObject({ role: "agent", email: `${fx.users.agentA}@test.local` });
  });

  it("refuses an empty or overlong name", async () => {
    const qa = await auth(fx.users.qa);

    const empty = await request(ctx.app).patch("/api/me").set(qa).send({ displayName: "   " });
    const long = await request(ctx.app)
      .patch("/api/me")
      .set(qa)
      .send({ displayName: "x".repeat(81) });

    expect([empty.status, long.status]).toEqual([400, 400]);
    expect((empty.body as { error: { code: string } }).error.code).toBe("validation_error");
  });

  it("needs a signed-in person", async () => {
    await request(ctx.app).patch("/api/me").send({ displayName: "Nobody" }).expect(401);
  });
});
