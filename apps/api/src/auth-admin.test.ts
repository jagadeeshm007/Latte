import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAuthAdmin } from "./auth-admin.ts";
import { ConflictError } from "./errors.ts";

// SCC-7-1: someone not yet invited who signs in with Google still gets a
// Supabase Auth user, only no profile. Inviting that email then failed with
// "already registered" and the manager could never let them in. The invite
// now takes over a login whose email is confirmed, and replaces one that is
// not, so a stranger's unconfirmed password sign-up cannot be handed the role.

interface Seen {
  method: string;
  path: string;
  body: Record<string, unknown>;
}

const NEW_ID = "11111111-1111-4111-8111-111111111111";
const EXISTING_ID = "22222222-2222-4222-8222-222222222222";

let server: Server;
let url: string;
let seen: Seen[];
let existing: { confirmed: boolean } | null;
let lookupFails: boolean;
let otpFails: boolean;

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let text = "";
  for await (const chunk of req) text += String(chunk);
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

function user(id: string, confirmed: boolean) {
  return {
    id,
    aud: "authenticated",
    email: "pat@example.com",
    email_confirmed_at: confirmed ? "2026-10-25T09:00:00Z" : null,
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-10-25T09:00:00Z",
  };
}

beforeAll(async () => {
  server = createServer((req, res) => {
    void (async () => {
      const path = (req.url ?? "").split("?")[0] ?? "";
      const method = req.method ?? "";
      seen.push({ method, path, body: await readBody(req) });
      const json = (status: number, body: unknown) => {
        res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
      };
      if (path === "/auth/v1/invite") {
        if (existing) {
          json(422, {
            code: 422,
            error_code: "email_exists",
            msg: "A user with this email address has already been registered",
          });
          return;
        }
        json(200, user(NEW_ID, false));
        return;
      }
      if (path === "/auth/v1/admin/generate_link") {
        if (lookupFails || !existing) {
          json(500, { code: 500, error_code: "unexpected_failure", msg: "boom" });
          return;
        }
        json(200, { ...user(EXISTING_ID, existing.confirmed), action_link: "https://x/verify" });
        return;
      }
      if (method === "DELETE" && path === `/auth/v1/admin/users/${EXISTING_ID}`) {
        existing = null;
        json(200, user(EXISTING_ID, false));
        return;
      }
      if (path === "/auth/v1/otp") {
        if (otpFails) {
          json(429, { code: 429, error_code: "over_email_send_rate_limit", msg: "rate limited" });
          return;
        }
        json(200, {});
        return;
      }
      json(404, { code: 404, msg: "not found" });
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
});
afterAll(() => {
  server.close();
});
beforeEach(() => {
  seen = [];
  existing = null;
  lookupFails = false;
  otpFails = false;
});

const admin = () =>
  createAuthAdmin({ SUPABASE_URL: url, SUPABASE_SECRET_KEY: "service-key-for-tests" });
const paths = () => seen.map((s) => `${s.method} ${s.path}`);

describe("authAdmin.invite", () => {
  it("invites a new email and returns the new user", async () => {
    const out = await admin().invite("pat@example.com", "Pat", "https://latte.test");

    expect(out).toEqual({ id: NEW_ID });
    expect(paths()).toEqual(["POST /auth/v1/invite"]);
  });

  it("takes over a confirmed login with no profile and emails a sign-in link", async () => {
    existing = { confirmed: true };

    const out = await admin().invite("pat@example.com", "Pat", "https://latte.test");

    expect(out).toEqual({ id: EXISTING_ID });
    expect(paths()).not.toContain(`DELETE /auth/v1/admin/users/${EXISTING_ID}`);
    expect(seen.find((s) => s.path === "/auth/v1/otp")?.body).toMatchObject({
      email: "pat@example.com",
      create_user: false,
    });
  });

  it("still takes over the login when the sign-in email fails, and says so", async () => {
    existing = { confirmed: true };
    otpFails = true;

    const out = await admin().invite("pat@example.com", "Pat", "https://latte.test");

    expect(out).toEqual({ id: EXISTING_ID, signInLinkFailed: true });
  });

  it("replaces an unconfirmed login and sends the normal invite", async () => {
    existing = { confirmed: false };

    const out = await admin().invite("pat@example.com", "Pat", "https://latte.test");

    expect(out).toEqual({ id: NEW_ID });
    expect(paths()).toContain(`DELETE /auth/v1/admin/users/${EXISTING_ID}`);
    expect(paths().filter((p) => p === "POST /auth/v1/invite")).toHaveLength(2);
    expect(paths()).not.toContain("POST /auth/v1/otp");
  });

  it("answers a conflict when the existing login cannot be found", async () => {
    existing = { confirmed: true };
    lookupFails = true;

    const invite = admin().invite("pat@example.com", "Pat", "https://latte.test");

    await expect(invite).rejects.toThrow(ConflictError);
  });
});
