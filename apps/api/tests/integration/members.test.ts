import { readFile } from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type Fixture, resetData, seedFixture, testApp, testPool } from "./helpers.ts";
import type { Client, Pool } from "../../src/db/pool.ts";

// Phase E: invite-only members, turning accounts off, and the last-manager guard (ADR-0024).

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

describe("members", () => {
  it("invites someone with a role before they first sign in", async () => {
    const res = await request(ctx.app)
      .post("/api/members")
      .set(await auth(fx.users.manager))
      .send({ email: "neha@example.com", displayName: "Neha", role: "qa_reviewer" })
      .expect(201);

    expect(res.body).toMatchObject({
      email: "neha@example.com",
      role: "qa_reviewer",
      disabledAt: null,
    });
    expect(ctx.invites.sent).toEqual([
      { email: "neha@example.com", displayName: "Neha", redirectTo: "http://localhost:5173" },
    ]);
    const signedIn = await request(ctx.app)
      .get("/api/me")
      .set(await auth((res.body as { id: string }).id));
    expect(signedIn.status).toBe(200);
  });

  it("refuses a second invite to the same email and an agent with no agent record", async () => {
    const manager = await auth(fx.users.manager);

    const twice = await request(ctx.app)
      .post("/api/members")
      .set(manager)
      .send({ email: `${fx.users.qa}@TEST.local`, displayName: "QA again", role: "qa_reviewer" });
    const noAgent = await request(ctx.app)
      .post("/api/members")
      .set(manager)
      .send({ email: "a@example.com", displayName: "A", role: "agent" });

    expect([twice.status, noAgent.status]).toEqual([409, 400]);
    expect(ctx.invites.sent).toEqual([]);
  });

  it("refuses a turned-off account everywhere, its API keys too, until it is turned back on", async () => {
    const manager = await auth(fx.users.manager);
    const second = (
      await request(ctx.app)
        .post("/api/members")
        .set(manager)
        .send({ email: "m2@example.com", displayName: "Second manager", role: "manager" })
        .expect(201)
    ).body as { id: string };
    const key = await request(ctx.app)
      .post("/api/api-keys")
      .set(await auth(second.id))
      .send({ name: "Theirs", scopes: ["calls:read"] })
      .expect(201);

    await request(ctx.app)
      .patch(`/api/members/${second.id}`)
      .set(manager)
      .send({ disabled: true })
      .expect(200);
    const session = await request(ctx.app)
      .get("/api/me")
      .set(await auth(second.id));
    const viaKey = await request(ctx.app)
      .get("/api/me")
      .set({ Authorization: `Bearer ${(key.body as { secret: string }).secret}` });
    await request(ctx.app)
      .patch(`/api/members/${second.id}`)
      .set(manager)
      .send({ disabled: false })
      .expect(200);
    const back = await request(ctx.app)
      .get("/api/me")
      .set(await auth(second.id));

    expect([session.status, viaKey.status, back.status]).toEqual([403, 403, 200]);
  });

  it("keeps at least one active manager, and nobody turns themselves off", async () => {
    const manager = await auth(fx.users.manager);

    const demote = await request(ctx.app)
      .patch(`/api/members/${fx.users.manager}`)
      .set(manager)
      .send({ role: "qa_reviewer" });
    const self = await request(ctx.app)
      .patch(`/api/members/${fx.users.manager}`)
      .set(manager)
      .send({ disabled: true });

    expect([demote.status, self.status]).toEqual([409, 409]);
    expect((demote.body as { error: { message: string } }).error.message).toContain(
      "at least one active manager",
    );
  });

  it("links an agent account to its agent, and unlinks it when the role changes", async () => {
    const manager = await auth(fx.users.manager);
    const free = (
      await pool.query<{ id: string }>(
        "INSERT INTO agents (team_id, name, external_code) VALUES ($1, 'Agent C', 'C1') RETURNING id",
        [fx.teamId],
      )
    ).rows[0]!.id;

    const toAgent = await request(ctx.app)
      .patch(`/api/members/${fx.users.qa}`)
      .set(manager)
      .send({ role: "agent", agentId: free })
      .expect(200);
    const backToQa = await request(ctx.app)
      .patch(`/api/members/${fx.users.qa}`)
      .set(manager)
      .send({ role: "qa_reviewer" })
      .expect(200);

    expect(toAgent.body).toMatchObject({ role: "agent", agentId: free, agentName: "Agent C" });
    expect(backToQa.body).toMatchObject({ role: "qa_reviewer", agentId: null });
  });

  it("is for managers only", async () => {
    const res = await request(ctx.app)
      .get("/api/members")
      .set(await auth(fx.users.qa));

    expect(res.status).toBe(403);
  });
});

describe("migration 0012", () => {
  it("reverses with its down file and applies again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0012_members.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0012_members.sql"), "utf8");
    const columns = async (client: Client) =>
      (
        await client.query<{ column_name: string }>(
          "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'disabled_at'",
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

      expect([afterDown, afterUp]).toEqual([[], ["disabled_at"]]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
