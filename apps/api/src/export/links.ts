import { createHmac, timingSafeEqual } from "node:crypto";

import { BATCH_EXPORT_PARTS } from "@scc/shared";
import { z } from "zod";

// Short-lived signed links for batch exports (ADR-0017). A browser cannot
// send its bearer token on a plain download, and a ZIP of recordings is too
// big to buffer in the page, so the API signs a link the browser can open:
// it names the batch, the person and what to export, and expires in minutes.
// The token travels in the query string, which the request log leaves out.

export const EXPORT_LINK_SECONDS = 5 * 60;

const payloadSchema = z.object({
  batchId: z.uuid(),
  userId: z.uuid(),
  format: z.enum(["csv", "zip"]),
  include: z.array(z.enum(BATCH_EXPORT_PARTS)),
  /** Expiry, seconds since the epoch. */
  exp: z.number().int(),
});
export type ExportLink = z.infer<typeof payloadSchema>;

function mac(secret: Buffer, body: string): Buffer {
  return createHmac("sha256", secret).update(body).digest();
}

export function signExportLink(
  secret: Buffer,
  link: Omit<ExportLink, "exp">,
  now = Date.now(),
): string {
  const body = Buffer.from(
    JSON.stringify({ ...link, exp: Math.floor(now / 1000) + EXPORT_LINK_SECONDS }),
  ).toString("base64url");
  return `${body}.${mac(secret, body).toString("base64url")}`;
}

/** verifyExportLink returns the link's contents, or null when it is forged, altered or expired. */
export function verifyExportLink(
  secret: Buffer,
  token: string,
  now = Date.now(),
): ExportLink | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = mac(secret, body);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const link = payloadSchema.safeParse(parsed);
  if (!link.success || link.data.exp * 1000 < now) return null;
  return link.data;
}
