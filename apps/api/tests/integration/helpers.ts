import { randomUUID } from "node:crypto";

import { createGateway, type Gateway } from "@scc/gateway";
import { DEFAULT_RUBRIC, DEFAULT_RUBRIC_NAME, type Role } from "@scc/shared";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { pino } from "pino";
import { type Mock, vi } from "vitest";

import { buildApp } from "../../src/app.ts";
import { createVerifier } from "../../src/auth.ts";
import { migrate } from "../../src/db/migrate.ts";
import { createPool, inTransaction, type Pool } from "../../src/db/pool.ts";
import type { Enqueue } from "../../src/jobs/queue.ts";
import { PgUsageStore, saveRubricVersion } from "../../src/repo/reference.ts";
import type { AppDeps } from "../../src/routes/deps.ts";
import type { Storage } from "../../src/storage.ts";

// Integration harness: a real Postgres (make db), a local JWKS standing in
// for Supabase Auth, in-memory storage and a recording queue.

export const SUPABASE_URL = "https://test-project.supabase.co";
const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/scc_test";

export async function testPool(): Promise<Pool> {
  const pool = createPool({
    DATABASE_URL,
    DB_POOL_MAX: 4,
    DB_SSL: false,
    SUPABASE_POOLER_HOST: "unused",
  });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(pool);
  return pool;
}

export async function resetData(pool: Pool): Promise<void> {
  await pool.query(
    `TRUNCATE audit_events, status_checks, status_notices, saved_views, notifications, alert_firings, alert_rules, digest_subscriptions, finding_reviews, findings, scores, model_calls, transcript_segments, webhook_deliveries, webhook_endpoints, idempotency_keys, calls, batches, rate_limit_windows, api_requests, api_keys, rubrics,
              profiles, agents, products, teams RESTART IDENTITY CASCADE`,
  );
  // A single price row the migration seeds; put the defaults back for each test.
  await pool.query("DELETE FROM billing_prices; INSERT INTO billing_prices (id) VALUES (1)");
}

export interface Fixture {
  teamId: string;
  productId: string;
  agentA: string;
  agentB: string;
  users: Record<"qa" | "manager" | "agentA" | "agentB", string>;
}

export async function seedFixture(pool: Pool): Promise<Fixture> {
  const q = async (sql: string, params: unknown[]) =>
    (await pool.query<{ id: string }>(sql, params)).rows[0]!.id;
  const teamId = await q("INSERT INTO teams (name) VALUES ($1) RETURNING id", ["Team One"]);
  const productId = await q("INSERT INTO products (name) VALUES ($1) RETURNING id", ["ULIP"]);
  const agentA = await q(
    "INSERT INTO agents (team_id, name, external_code) VALUES ($1, $2, $3) RETURNING id",
    [teamId, "Agent A", "A1"],
  );
  const agentB = await q(
    "INSERT INTO agents (team_id, name, external_code) VALUES ($1, $2, $3) RETURNING id",
    [teamId, "Agent B", "B1"],
  );
  const users = {
    qa: randomUUID(),
    manager: randomUUID(),
    agentA: randomUUID(),
    agentB: randomUUID(),
  };
  const profiles: [string, Role, string | null][] = [
    [users.qa, "qa_reviewer", null],
    [users.manager, "manager", null],
    [users.agentA, "agent", agentA],
    [users.agentB, "agent", agentB],
  ];
  for (const [id, role, agentId] of profiles) {
    await pool.query(
      "INSERT INTO profiles (id, email, display_name, role, agent_id) VALUES ($1, $2, $3, $4, $5)",
      [id, `${id}@test.local`, `${role} user`, role, agentId],
    );
  }
  await inTransaction(pool, (db) =>
    saveRubricVersion(db, { name: DEFAULT_RUBRIC_NAME, items: DEFAULT_RUBRIC, createdBy: null }),
  );
  return { teamId, productId, agentA, agentB, users };
}

export async function tokenIssuer() {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "ES256" };
  const verify = createVerifier(createLocalJWKSet({ keys: [jwk] }), SUPABASE_URL);
  const sign = (sub: string, overrides: { issuer?: string; expiresIn?: string } = {}) =>
    new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "ES256", kid: "test" })
      .setSubject(sub)
      .setIssuer(overrides.issuer ?? `${SUPABASE_URL}/auth/v1`)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime(overrides.expiresIn ?? "1h")
      .sign(privateKey);
  return { verify, sign };
}

export class MemoryStorage implements Storage {
  readonly objects = new Map<string, Uint8Array>();
  signUpload(path: string) {
    return Promise.resolve({
      signedUrl: `https://storage.test/upload/${path}`,
      token: "upload-token",
    });
  }
  signDownload(path: string, seconds: number, downloadAs?: string) {
    const as = downloadAs ? `&download=${encodeURIComponent(downloadAs)}` : "";
    return Promise.resolve(`https://storage.test/download/${path}?expires=${String(seconds)}${as}`);
  }
  exists(path: string) {
    return Promise.resolve(this.objects.has(path));
  }
  download(path: string) {
    const bytes = this.objects.get(path);
    return bytes ? Promise.resolve(bytes) : Promise.reject(new Error(`missing ${path}`));
  }
  remove(paths: string[]) {
    for (const p of paths) this.objects.delete(p);
    return Promise.resolve();
  }
  list(prefix: string) {
    const names = [...this.objects.keys()]
      .filter((k) => (prefix ? k.startsWith(`${prefix}/`) : true))
      .map((k) => (prefix ? k.slice(prefix.length + 1) : k.split("/")[0]!));
    return Promise.resolve(
      [...new Set(names)].map((name) => ({ name, createdAt: "2000-01-01T00:00:00Z" })),
    );
  }
  ensureBucket() {
    return Promise.resolve();
  }
}

export function recordingQueue() {
  const sent: {
    queue: string;
    callId: string | undefined;
    startAfterSeconds: number | undefined;
    priority: number | undefined;
  }[] = [];
  const enqueue: Enqueue = (queue, data, options) => {
    sent.push({
      queue,
      callId: data.callId,
      startAfterSeconds: options?.startAfterSeconds,
      priority: options?.priority,
    });
    return Promise.resolve();
  };
  return { sent, enqueue };
}

export const log = pino({ level: "silent" });
/** A fixed key for encrypting webhook secrets in tests. */
export const TEST_ENCRYPTION_KEY = "ab".repeat(32);
/** The scheduler's secret in tests; a deployment's comes from the environment. */
export const TEST_CRON_SECRET = "cron-secret-for-tests-".padEnd(40, "x");

/** A stand-in for Supabase's invitations: records each one and hands back a new user id. */
export function fakeInvites() {
  const sent: { email: string; displayName: string; redirectTo: string }[] = [];
  return {
    sent,
    invite: (email: string, displayName: string, redirectTo: string) => {
      sent.push({ email, displayName, redirectTo });
      return Promise.resolve({ id: randomUUID() });
    },
  };
}

/** testApp builds the app on fakes; extra adds or overrides dependencies, such as cron tasks. */
export async function testApp(pool: Pool, extra: Partial<AppDeps> = {}) {
  const invites = fakeInvites();
  const storage = new MemoryStorage();
  const queue = recordingQueue();
  const tokens = await tokenIssuer();
  const app = buildApp({
    config: {
      AUDIO_RETENTION_DAYS: 90,
      SIGNED_URL_SECONDS: 600,
      LLM_BUDGET_USD: 5,
      WEB_ORIGIN: "http://localhost:5173",
      DATA_ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
      CRON_SECRET: TEST_CRON_SECRET,
    },
    pool,
    storage,
    enqueue: queue.enqueue,
    verify: tokens.verify,
    log,
    authAdmin: invites,
    ...extra,
  });
  return { app, storage, queue, sign: tokens.sign, invites };
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * fakeGateway answers model calls from the functions given, through the real
 * gateway: Groq STT and chat, and Sarvam STT and translation (through its SDK).
 */
export function fakeGateway(
  pool: Pool,
  responses: {
    stt?: (body: FormData) => unknown;
    chat?: (body: Record<string, unknown>) => unknown;
    sarvamStt?: (body: FormData) => unknown;
    translate?: (body: Record<string, unknown>) => unknown;
  },
): { gateway: Gateway; fetch: Mock<FetchLike> } {
  const store = new PgUsageStore(pool);
  const fetch = vi.fn<FetchLike>((url, init) => {
    if (url.endsWith("/audio/transcriptions") && responses.stt) {
      return Promise.resolve(
        new Response(JSON.stringify(responses.stt(init.body as FormData)), { status: 200 }),
      );
    }
    if (url.endsWith("api.sarvam.ai/speech-to-text") && responses.sarvamStt) {
      return Promise.resolve(
        Response.json(responses.sarvamStt(init.body as FormData), { status: 200 }),
      );
    }
    if (url.endsWith("api.sarvam.ai/translate") && responses.translate) {
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      return Promise.resolve(Response.json(responses.translate(body), { status: 200 }));
    }
    if (url.endsWith("/chat/completions") && responses.chat) {
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      return Promise.resolve(new Response(JSON.stringify(responses.chat(body)), { status: 200 }));
    }
    return Promise.resolve(new Response("unexpected", { status: 400 }));
  });
  const gateway = createGateway(
    {
      mode: "live",
      budgetUsd: 5,
      cassetteDir: "/nonexistent",
      apiKeys: { groq: "test", sarvam: "test" },
      routes: {
        chat: { provider: "groq", model: "openai/gpt-oss-120b" },
        stt: { provider: "groq", model: "whisper-large-v3" },
        tts: { provider: "groq", model: "canopylabs/orpheus-v1-english" },
        sttRegional: { provider: "sarvam", model: "saaras:v4" },
        translate: { provider: "sarvam", model: "sarvam-translate:v1" },
      },
    },
    store,
    { fetch: fetch as unknown as typeof globalThis.fetch },
  );
  return { gateway, fetch };
}

/** insertScoredCall adds a scored call straight in SQL, for tests about dates and aggregates. */
export async function insertScoredCall(
  pool: Pool,
  fx: Fixture,
  o: { callDate: string; needsReview?: boolean; score?: number; agentId?: string },
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `WITH b AS (INSERT INTO batches (name, created_by) VALUES ('Scored', $4) RETURNING id),
          c AS (INSERT INTO calls (agent_id, team_id, product_id, call_date, batch_id, uploaded_by, original_filename,
                                   mime_type, size_bytes, storage_path, status, retention_until)
                SELECT $1, $2, $3, $5::date, b.id, $4, 'c.wav', 'audio/wav', 10,
                       $4::text || '/' || gen_random_uuid() || '.wav', 'scored', current_date + 90 FROM b
                RETURNING id)
     INSERT INTO scores (call_id, rubric_id, overall_score, judge_status, talk_ratio, needs_review, review_status)
     SELECT c.id, (SELECT id FROM rubrics WHERE is_active LIMIT 1), $6, 'ok', 0.5, $7,
            CASE WHEN $7 THEN 'pending'::review_status ELSE 'not_required'::review_status END
       FROM c RETURNING call_id AS id`,
    [
      o.agentId ?? fx.agentA,
      fx.teamId,
      fx.productId,
      fx.users.qa,
      o.callDate,
      o.score ?? 80,
      o.needsReview ?? false,
    ],
  );
  return rows[0]!.id;
}
