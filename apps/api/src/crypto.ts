import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { ServiceUnavailableError } from "./errors.ts";

// Secrets the API must read back (webhook signing secrets) are kept encrypted
// with AES-256-GCM under DATA_ENCRYPTION_KEY. The stored form is
// v1.<iv>.<tag>.<ciphertext>, base64url, so the format can change later.

const VERSION = "v1";

function keyOf(hex: string | undefined): Buffer {
  if (!hex) {
    throw new ServiceUnavailableError("DATA_ENCRYPTION_KEY is not set; webhooks are unavailable");
  }
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plain: string, keyHex: string | undefined): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyOf(keyHex), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), body]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function decryptSecret(stored: string, keyHex: string | undefined): string {
  const [version, iv, tag, body] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !body) throw new Error("unreadable encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", keyOf(keyHex), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
