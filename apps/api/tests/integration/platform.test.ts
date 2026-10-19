import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type Fixture,
  log,
  resetData,
  seedFixture,
  TEST_ENCRYPTION_KEY,
  testApp,
  testPool,
} from "./helpers.ts";
import { API_KEY_ROUTES } from "../../src/api-access.ts";
import type { Client, Pool } from "../../src/db/pool.ts";
import { emitEvent } from "../../src/repo/webhooks.ts";
import { deliverDue, type Post } from "../../src/webhooks/sender.ts";

// The developer platform after Phase A and B: key rotation and revoke-all,
// webhooks through the outbox, idempotency keys, and CORS for PATCH.

let pool: Pool;
let fx: Fixture;
let ctx: Awaited<ReturnType<typeof testApp>>;
const auth = async (sub: string) => ({ Authorization: `Bearer ${await ctx.sign(sub)}` });
const bearer = (secret: string) => ({ Authorization: `Bearer ${secret}` });

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

async function createKey(body: Record<string, unknown> = {}) {
  const res = await request(ctx.app)
    .post("/api/api-keys")
    .set(await auth(fx.users.manager))
    .send({ name: "CRM sync", scopes: ["calls:read"], ...body })
    .expect(201);
  const created = res.body as { key: { id: string }; secret: string };
  return { id: created.key.id, secret: created.secret };
}

async function createWebhook(events = ["call.scored"]) {
  const res = await request(ctx.app)
    .post("/api/webhooks")
    .set(await auth(fx.users.manager))
    .send({ url: "https://hooks.example.com/latte", events })
    .expect(201);
  return res.body as { endpoint: { id: string }; secret: string };
}

/** A fake receiver that answers with the statuses given in turn and records what it got. */
function receiver(statuses: number[]) {
  const got: { url: string; headers: Record<string, string>; body: string }[] = [];
  const post: Post = (url, headers, body) => {
    got.push({ url, headers, body });
    const status = statuses.shift() ?? 200;
    return Promise.resolve({
      ok: status < 300,
      status,
      error: status < 300 ? null : `HTTP ${String(status)}`,
    });
  };
  return { post, got };
}
const send = (post: Post) => deliverDue({ pool, log, encryptionKey: TEST_ENCRYPTION_KEY, post });

describe("key rotation and revoke-all", () => {
  it("rotates a key: the successor works now, the old key runs out after its grace", async () => {
    const old = await createKey({ scopes: ["calls:read"], limits: { read: 900 } });
    const manager = await auth(fx.users.manager);

    const rotated = await request(ctx.app)
      .post(`/api/api-keys/${old.id}/rotate`)
      .set(manager)
      .expect(201);
    const fresh = rotated.body as {
      key: { id: string; scopes: string[]; limits: { read: number } };
      secret: string;
    };
    const oldStillWorks = await request(ctx.app).get("/api/me").set(bearer(old.secret));
    await pool.query("UPDATE api_keys SET expires_at = now() - interval '1 second' WHERE id = $1", [
      old.id,
    ]);
    const oldAfterGrace = await request(ctx.app).get("/api/me").set(bearer(old.secret));
    const freshWorks = await request(ctx.app).get("/api/me").set(bearer(fresh.secret));
    const twice = await request(ctx.app).post(`/api/api-keys/${old.id}/rotate`).set(manager);

    expect(fresh.key).toMatchObject({ scopes: ["calls:read"], limits: { read: 900 } });
    expect([oldStillWorks.status, oldAfterGrace.status, freshWorks.status, twice.status]).toEqual([
      200, 401, 200, 409,
    ]);
  });

  it("revokes every key at once only when the confirmation is typed", async () => {
    const a = await createKey();
    const b = await createKey();
    const manager = await auth(fx.users.manager);

    await request(ctx.app)
      .post("/api/api-keys/revoke-all")
      .set(manager)
      .send({ confirm: "yes" })
      .expect(400);
    const done = await request(ctx.app)
      .post("/api/api-keys/revoke-all")
      .set(manager)
      .send({ confirm: "REVOKE ALL" })
      .expect(200);

    expect(done.body).toEqual({ revoked: 2 });
    expect((await request(ctx.app).get("/api/me").set(bearer(a.secret))).status).toBe(401);
    expect((await request(ctx.app).get("/api/me").set(bearer(b.secret))).status).toBe(401);
  });
});

describe("webhooks (ADR-0021)", () => {
  it("shows the signing secret once and keeps it encrypted", async () => {
    const { endpoint, secret } = await createWebhook();

    const list = await request(ctx.app)
      .get("/api/webhooks")
      .set(await auth(fx.users.manager));
    const stored = await pool.query<{ secret_ciphertext: string }>(
      "SELECT secret_ciphertext FROM webhook_endpoints WHERE id = $1",
      [endpoint.id],
    );

    expect(secret).toMatch(/^whsec_/);
    expect(JSON.stringify(list.body)).not.toContain(secret);
    expect(stored.rows[0]!.secret_ciphertext).not.toContain(secret.slice(6));
  });

  it("refuses an endpoint that is not https on the standard port", async () => {
    const manager = await auth(fx.users.manager);

    const answers = await Promise.all(
      [
        "http://hooks.example.com",
        "https://hooks.example.com:8443",
        "https://u:p@hooks.example.com",
      ].map((url) =>
        request(ctx.app)
          .post("/api/webhooks")
          .set(manager)
          .send({ url, events: ["call.scored"] }),
      ),
    );

    expect(answers.map((r) => r.status)).toEqual([400, 400, 400]);
  });

  it("signs each delivery so the receiver can check it came from Latte", async () => {
    const { endpoint, secret } = await createWebhook();
    await request(ctx.app)
      .post(`/api/webhooks/${endpoint.id}/test`)
      .set(await auth(fx.users.manager))
      .expect(202);
    const { post, got } = receiver([200]);

    await send(post);

    const [sent] = got;
    const [t, v1] = sent!.headers["Latte-Signature"]!.split(",").map((p) => p.split("=")[1]);
    const expected = createHmac("sha256", secret).update(`${t!}.${sent!.body}`).digest("hex");
    expect(v1).toBe(expected);
    expect(sent!.headers["Latte-Event"]).toBe("ping");
    expect(JSON.parse(sent!.body)).toMatchObject({
      type: "ping",
      data: { message: expect.any(String) },
    });
  });

  it("delivers only to subscribed endpoints, retries a failure later, and logs each attempt", async () => {
    const subscribed = await createWebhook(["call.scored"]);
    await createWebhook(["batch.completed"]);
    await emitEvent(pool, "call.scored", { callId: "c1" });
    const { post, got } = receiver([500]);

    const first = await send(post);
    const again = await send(receiver([]).post);
    const deliveries = await request(ctx.app)
      .get(`/api/webhooks/${subscribed.endpoint.id}/deliveries`)
      .set(await auth(fx.users.manager))
      .expect(200);

    expect(first).toEqual({ sent: 0, failed: 1 });
    expect(again).toEqual({ sent: 0, failed: 0 });
    expect(got).toHaveLength(1);
    expect(deliveries.body).toMatchObject({
      total: 1,
      items: [{ status: "pending", attempts: 1, lastStatus: 500, eventType: "call.scored" }],
    });
  });

  it("gives up after the last retry, and redelivers on request", async () => {
    const { endpoint } = await createWebhook();
    await emitEvent(pool, "call.scored", { callId: "c1" });
    // Eight retries after the first attempt: the ninth attempt is the last.
    await pool.query("UPDATE webhook_deliveries SET attempts = 8");

    await send(receiver([500]).post);
    const failed = await pool.query<{ id: string; status: string }>(
      "SELECT id, status FROM webhook_deliveries",
    );
    await request(ctx.app)
      .post(`/api/webhooks/${endpoint.id}/deliveries/${failed.rows[0]!.id}/redeliver`)
      .set(await auth(fx.users.manager))
      .expect(202);
    const result = await send(receiver([204]).post);

    expect(failed.rows[0]!.status).toBe("failed");
    expect(result).toEqual({ sent: 1, failed: 0 });
  });

  it("turns an endpoint off after 50 failures in a row, and back on by a manager", async () => {
    const { endpoint } = await createWebhook();
    await pool.query("UPDATE webhook_endpoints SET consecutive_failures = 49 WHERE id = $1", [
      endpoint.id,
    ]);
    await emitEvent(pool, "call.scored", { callId: "c1" });

    await send(receiver([503]).post);
    const off = await request(ctx.app)
      .get(`/api/webhooks/${endpoint.id}`)
      .set(await auth(fx.users.manager));
    const on = await request(ctx.app)
      .patch(`/api/webhooks/${endpoint.id}`)
      .set(await auth(fx.users.manager))
      .send({ enabled: true })
      .expect(200);

    expect((off.body as { disabledReason: string }).disabledReason).toContain("50");
    expect(on.body).toMatchObject({ disabledAt: null, consecutiveFailures: 0 });
  });

  it("lets a key with webhooks:write manage endpoints, and no other key", async () => {
    const writer = await createKey({ scopes: ["webhooks:write"] });
    const reader = await createKey({ scopes: ["calls:read"] });
    const body = { url: "https://hooks.example.com/k", events: ["batch.completed"] };

    const made = await request(ctx.app).post("/api/webhooks").set(bearer(writer.secret)).send(body);
    const refused = await request(ctx.app)
      .post("/api/webhooks")
      .set(bearer(reader.secret))
      .send(body);

    expect([made.status, refused.status]).toEqual([201, 403]);
  });

  it("deletes an endpoint with its deliveries, and audits it", async () => {
    const { endpoint } = await createWebhook();
    await emitEvent(pool, "call.scored", { callId: "c1" });

    await request(ctx.app)
      .delete(`/api/webhooks/${endpoint.id}`)
      .set(await auth(fx.users.manager))
      .expect(204);
    const left = await pool.query("SELECT 1 FROM webhook_deliveries");
    const audited = await pool.query("SELECT 1 FROM audit_events WHERE action = 'webhook_deleted'");

    expect([left.rowCount, audited.rowCount]).toEqual([0, 1]);
  });
});

describe("idempotency keys (ADR-0022)", () => {
  const create = async (key: string, name: string) =>
    request(ctx.app)
      .post("/api/api-keys")
      .set({ ...(await auth(fx.users.manager)), "Idempotency-Key": key })
      .send({ name, scopes: ["calls:read"] });

  it("replays the first response for the same key and body, and creates nothing twice", async () => {
    const first = await create("create-crm-key-1", "CRM");
    const second = await create("create-crm-key-1", "CRM");
    const { rows } = await pool.query("SELECT 1 FROM api_keys");

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.headers["idempotent-replayed"]).toBe("true");
    expect((second.body as { secret: string }).secret).toBe(
      (first.body as { secret: string }).secret,
    );
    expect(rows).toHaveLength(1);
  });

  it("refuses the same key with a different body, and a key still running", async () => {
    await create("k-2", "CRM");
    const mismatch = await create("k-2", "Dialler");
    await pool.query(
      `INSERT INTO idempotency_keys (owner, key, method, route, request_hash)
       VALUES ($1, 'k-3', 'POST', '/api-keys', 'x')`,
      [`user:${fx.users.manager}`],
    );
    const running = await create("k-3", "CRM");

    expect([mismatch.status, running.status]).toEqual([422, 409]);
  });

  it("keeps keys apart per caller, and refuses a malformed key", async () => {
    await create("shared-name", "CRM");
    const other = await request(ctx.app)
      .post("/api/rubrics")
      .set({ ...(await auth(fx.users.manager)), "Idempotency-Key": "has spaces" })
      .send({});
    const bad = await create("has spaces", "CRM");

    expect(other.status).not.toBe(201);
    expect(bad.status).toBe(400);
  });
});

describe("OpenAPI", () => {
  it("documents every route an API key can call", async () => {
    const res = await request(ctx.app).get("/api/openapi.json").expect(200);
    const paths = (res.body as { paths: Record<string, Record<string, unknown>> }).paths;
    const documented = Object.entries(paths).flatMap(([p, ops]) =>
      Object.keys(ops).map(
        (m) => `${m.toUpperCase()} ${p.replace(/^\/api/, "").replaceAll(/\{(\w+)\}/g, ":$1")}`,
      ),
    );

    expect(documented.sort()).toEqual(API_KEY_ROUTES.map((r) => `${r.method} ${r.route}`).sort());
  });
});

describe("CORS", () => {
  // SCC-1: PATCH was missing from the allowed methods, so the browser blocked renaming a batch or a key.
  it("allows PATCH and the Idempotency-Key header from the web app", async () => {
    const res = await request(ctx.app)
      .options("/api/batches/x")
      .set("Origin", "http://localhost:5173")
      .expect(204);

    expect(res.headers["access-control-allow-methods"]).toContain("PATCH");
    expect(res.headers["access-control-allow-headers"]).toContain("Idempotency-Key");
  });
});

describe("migration 0009", () => {
  it("reverses with its down file and applies again", async () => {
    const dir = path.join(import.meta.dirname, "../../src/db/migrations");
    const up = await readFile(path.join(dir, "0009_webhooks_idempotency.sql"), "utf8");
    const down = await readFile(path.join(dir, "down/0009_webhooks_idempotency.sql"), "utf8");
    const tables = async (client: Client) =>
      (
        await client.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables
            WHERE table_name IN ('webhook_endpoints', 'webhook_deliveries', 'idempotency_keys') ORDER BY 1`,
        )
      ).rows.map((r) => r.table_name);
    const client = await pool.connect();
    try {
      // DDL is transactional in Postgres: roll back so the shared test schema is untouched.
      await client.query("BEGIN");

      await client.query(down);
      const afterDown = await tables(client);
      await client.query(up);
      const afterUp = await tables(client);

      expect([afterDown, afterUp]).toEqual([
        [],
        ["idempotency_keys", "webhook_deliveries", "webhook_endpoints"],
      ]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
