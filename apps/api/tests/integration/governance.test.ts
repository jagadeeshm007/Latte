import { readFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_RUBRIC } from "@scc/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type Fixture,
  insertScoredCall,
  resetData,
  seedFixture,
  testApp,
  testPool,
} from "./helpers.ts";
import type { Client, Pool } from "../../src/db/pool.ts";
import { rubricFor } from "../../src/repo/reference.ts";

// Phase D: a rubric per product, retention per team, and PII redaction (ADR-0023).

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

describe("rubric per product", () => {
  it("scores a product with its own rubric and the rest with the default", async () => {
    const other = (
      await pool.query<{ id: string }>("INSERT INTO products (name) VALUES ('Term') RETURNING id")
    ).rows[0]!.id;
    const manager = await auth(fx.users.manager);
    const items = DEFAULT_RUBRIC.slice(0, 3);

    const saved = await request(ctx.app)
      .post("/api/rubrics")
      .set(manager)
      .send({ name: "ULIP rubric", items, productId: fx.productId })
      .expect(201);
    const forProduct = await request(ctx.app)
      .get(`/api/rubrics/active?productId=${fx.productId}`)
      .set(manager);
    const forOther = await request(ctx.app)
      .get(`/api/rubrics/active?productId=${other}`)
      .set(manager);
    const productVersions = await request(ctx.app)
      .get(`/api/rubrics?productId=${fx.productId}`)
      .set(manager);
    const defaultVersions = await request(ctx.app).get("/api/rubrics").set(manager);

    expect((saved.body as { productId: string }).productId).toBe(fx.productId);
    expect(forProduct.body).toMatchObject({ name: "ULIP rubric", productId: fx.productId });
    expect((forProduct.body as { items: unknown[] }).items).toHaveLength(3);
    expect(forOther.body).toMatchObject({ productId: null });
    expect((productVersions.body as { items: unknown[] }).items).toHaveLength(1);
    expect(
      (defaultVersions.body as { items: { productId: string | null }[] }).items.every(
        (r) => r.productId === null,
      ),
    ).toBe(true);
    expect((await rubricFor(pool, fx.productId))?.name).toBe("ULIP rubric");
  });

  it("keeps the default active when a product rubric is saved", async () => {
    const manager = await auth(fx.users.manager);

    await request(ctx.app)
      .post("/api/rubrics")
      .set(manager)
      .send({ name: "ULIP rubric", items: DEFAULT_RUBRIC, productId: fx.productId })
      .expect(201);
    const active = await pool.query("SELECT 1 FROM rubrics WHERE is_active");
    const unknown = await request(ctx.app).post("/api/rubrics").set(manager).send({
      name: "X",
      items: DEFAULT_RUBRIC,
      productId: "00000000-0000-4000-8000-000000000000",
    });

    expect(active.rowCount).toBe(2);
    expect(unknown.status).toBe(400);
  });
});

describe("retention per team", () => {
  it("moves stored recordings' purge dates when a team's retention changes", async () => {
    const callId = await insertScoredCall(pool, fx, { callDate: "2026-10-01" });
    const manager = await auth(fx.users.manager);

    const changed = await request(ctx.app)
      .patch(`/api/teams/${fx.teamId}`)
      .set(manager)
      .send({ audioRetentionDays: 30 })
      .expect(200);
    const call = await pool.query<{ days: number }>(
      "SELECT (retention_until - created_at::date) AS days FROM calls WHERE id = $1",
      [callId],
    );
    const list = await request(ctx.app).get("/api/teams").set(manager);
    const back = await request(ctx.app)
      .patch(`/api/teams/${fx.teamId}`)
      .set(manager)
      .send({ audioRetentionDays: null })
      .expect(200);

    expect(changed.body).toMatchObject({ audioRetentionDays: 30, effectiveRetentionDays: 30 });
    expect(call.rows[0]!.days).toBe(30);
    expect(list.body).toMatchObject({
      defaultRetentionDays: 90,
      items: [{ name: "Team One", calls: 1 }],
    });
    expect(back.body).toMatchObject({ audioRetentionDays: null, effectiveRetentionDays: 90 });
  });

  it("refuses a retention out of range and anyone but a manager", async () => {
    const tooLong = await request(ctx.app)
      .patch(`/api/teams/${fx.teamId}`)
      .set(await auth(fx.users.manager))
      .send({ audioRetentionDays: 5000 });
    const qa = await request(ctx.app)
      .get("/api/teams")
      .set(await auth(fx.users.qa));

    expect([tooLong.status, qa.status]).toEqual([400, 403]);
  });
});

describe("PII redaction", () => {
  async function callWithCard() {
    const callId = await insertScoredCall(pool, fx, { callDate: "2026-10-01" });
    await pool.query(
      `INSERT INTO transcript_segments (call_id, seq, channel, start_ms, end_ms, text, language, words, text_en)
       VALUES ($1, 0, 'customer', 0, 2000, 'my card is 4111 1111 1111 1111', 'en-IN',
               $2::jsonb, NULL)`,
      [
        callId,
        JSON.stringify(
          ["my", "card", "is", "4111", "1111", "1111", "1111"].map((text, i) => ({
            text,
            startMs: i * 100,
            endMs: i * 100 + 90,
          })),
        ),
      ],
    );
    return callId;
  }

  it("masks personal data in a call's transcript by default", async () => {
    const callId = await callWithCard();

    const res = await request(ctx.app)
      .get(`/api/calls/${callId}`)
      .set(await auth(fx.users.qa))
      .expect(200);

    const body = res.body as {
      redactions: number;
      segments: { text: string; words: { text: string }[] }[];
    };
    expect(body.redactions).toBe(1);
    expect(body.segments[0]!.text).toBe("my card is [card ••••1111]");
    expect(body.segments[0]!.words.map((w) => w.text)).toEqual([
      "my",
      "card",
      "is",
      "[card ••••1111]",
      "•",
      "•",
      "•",
    ]);
  });

  it("shows it to QA or a manager who asks, and audits each look", async () => {
    const callId = await callWithCard();

    const shown = await request(ctx.app)
      .get(`/api/calls/${callId}?reveal=pii`)
      .set(await auth(fx.users.manager))
      .expect(200);
    const audits = await pool.query(
      "SELECT actor_id FROM audit_events WHERE action = 'pii_revealed' AND call_id = $1",
      [callId],
    );

    expect(
      (shown.body as { segments: { text: string }[]; redactions: number }).segments[0]!.text,
    ).toBe("my card is 4111 1111 1111 1111");
    expect((shown.body as { redactions: number }).redactions).toBe(0);
    expect(audits.rows).toEqual([{ actor_id: fx.users.manager }]);
  });

  it("never shows it to an agent or an API key, even when asked", async () => {
    const callId = await callWithCard();
    const key = await request(ctx.app)
      .post("/api/api-keys")
      .set(await auth(fx.users.manager))
      .send({ name: "CRM", scopes: ["calls:read"] })
      .expect(201);

    const agent = await request(ctx.app)
      .get(`/api/calls/${callId}?reveal=pii`)
      .set(await auth(fx.users.agentA));
    const viaKey = await request(ctx.app)
      .get(`/api/calls/${callId}?reveal=pii`)
      .set({ Authorization: `Bearer ${(key.body as { secret: string }).secret}` });
    const audits = await pool.query("SELECT 1 FROM audit_events WHERE action = 'pii_revealed'");

    expect((agent.body as { segments: { text: string }[] }).segments[0]!.text).toContain(
      "[card ••••1111]",
    );
    expect((viaKey.body as { segments: { text: string }[] }).segments[0]!.text).toContain(
      "[card ••••1111]",
    );
    expect(audits.rowCount).toBe(0);
  });
});

describe("migration 0011", () => {
  it("reverses with its down file and applies again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0011_product_rubrics_retention.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0011_product_rubrics_retention.sql"), "utf8");
    const columns = async (client: Client) =>
      (
        await client.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
            WHERE (table_name, column_name) IN (('rubrics', 'product_id'), ('teams', 'audio_retention_days'))
            ORDER BY 1`,
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

      expect([afterDown, afterUp]).toEqual([[], ["audio_retention_days", "product_id"]]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
