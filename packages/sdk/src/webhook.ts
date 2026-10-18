import { createHmac, timingSafeEqual } from "node:crypto";

// Checking a Latte webhook (ADR-0021): the Latte-Signature header is
// `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">` under the
// endpoint's secret. Check it against the raw body before parsing it, and
// refuse old timestamps so a captured delivery cannot be replayed later.

export interface VerifyOptions {
  /** The endpoint's secret, whsec_… */
  secret: string;
  /** The Latte-Signature header as received. */
  header: string | null | undefined;
  /** The raw request body, exactly as received. */
  body: string;
  /** How old a delivery may be; 5 minutes by default. */
  toleranceSeconds?: number;
  now?: () => number;
}

/** verifyWebhookSignature is true only for a delivery Latte signed recently with this secret. */
export function verifyWebhookSignature(opts: VerifyOptions): boolean {
  const parts = new Map(
    (opts.header ?? "").split(",").map((p) => {
      const at = p.indexOf("=");
      return [p.slice(0, at).trim(), p.slice(at + 1).trim()] as const;
    }),
  );
  const t = Number(parts.get("t"));
  const given = parts.get("v1");
  if (!Number.isInteger(t) || !given || !/^[0-9a-f]{64}$/.test(given)) return false;
  const now = Math.floor((opts.now?.() ?? Date.now()) / 1000);
  if (Math.abs(now - t) > (opts.toleranceSeconds ?? 300)) return false;
  const expected = createHmac("sha256", opts.secret)
    .update(`${String(t)}.${opts.body}`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(given, "hex"));
}
