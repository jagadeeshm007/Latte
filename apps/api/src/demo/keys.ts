import { createHmac } from "node:crypto";

import type { DemoSessionRequest } from "@scc/shared";
import { jwtVerify, SignJWT } from "jose";

import { UnauthorizedError } from "../errors.ts";

// The demo's identity (ADR-0033). A visitor is a random id carried in a
// short-lived token; the device is only an HMAC of the IP and a few browser
// signals, used as the key of the one-upload limit and never stored raw.

/** Every demo token starts with this, so authenticate can route it without parsing. */
export const DEMO_TOKEN_PREFIX = "ldemo_";
const AUDIENCE = "latte-demo";

export interface DemoKeys {
  /** Signs and checks demo tokens (HS256). */
  token: Uint8Array;
  /** Keys the device and IP hashes. */
  fingerprint: Buffer;
}

const derive = (secret: string, label: string) =>
  createHmac("sha256", secret).update(`latte-demo:${label}`).digest();

/** demoKeys turns DEMO_SECRET into one key per use, so a leak of one hash says nothing of the other. */
export function demoKeys(secret: string): DemoKeys {
  return {
    token: new Uint8Array(derive(secret, "token")),
    fingerprint: derive(secret, "fingerprint"),
  };
}

/** hash joins the parts with a separator no header carries, so "ab"+"c" and "a"+"bc" differ. */
function hash(key: Buffer, parts: string[]): string {
  return createHmac("sha256", key).update(parts.join("\u0000")).digest("hex");
}

export type DemoSignals = Required<{ [K in keyof DemoSessionRequest]: string }>;

/** fingerprintOf is the device's limit key: the IP, the user agent and the browser signals. */
export function fingerprintOf(
  keys: DemoKeys,
  ip: string,
  userAgent: string,
  signals: DemoSignals,
): string {
  return hash(keys.fingerprint, [
    "device",
    ip,
    userAgent,
    signals.platform,
    signals.language,
    signals.timeZone,
    signals.screen,
  ]);
}

/** ipHashOf keys the per-IP limit on starting demo sessions. */
export function ipHashOf(keys: DemoKeys, ip: string): string {
  return hash(keys.fingerprint, ["ip", ip]);
}

export async function signDemoToken(
  keys: DemoKeys,
  visitorId: string,
  expiresAt: Date,
): Promise<string> {
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(visitorId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(keys.token);
  return `${DEMO_TOKEN_PREFIX}${jwt}`;
}

/** verifyDemoToken returns the visitor id, or throws 401 for anything it did not sign or that has run out. */
export async function verifyDemoToken(keys: DemoKeys, token: string): Promise<string> {
  if (!token.startsWith(DEMO_TOKEN_PREFIX)) throw new UnauthorizedError("invalid demo session");
  try {
    const { payload } = await jwtVerify(token.slice(DEMO_TOKEN_PREFIX.length), keys.token, {
      audience: AUDIENCE,
      algorithms: ["HS256"],
      requiredClaims: ["exp", "sub"],
    });
    if (!payload.sub) throw new Error("no subject");
    return payload.sub;
  } catch {
    throw new UnauthorizedError("this demo session has ended; start the demo again");
  }
}
