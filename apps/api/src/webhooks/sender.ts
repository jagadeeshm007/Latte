import { createHmac } from "node:crypto";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import { isIP, type LookupFunction } from "node:net";

import type { Logger } from "pino";

import { decryptSecret } from "../crypto.ts";
import type { Queryable } from "../db/pool.ts";
import { claimDue, recordAttempt } from "../repo/webhooks.ts";

// Sends due webhook deliveries (ADR-0021). Each payload is signed
// `Latte-Signature: t=<unix>,v1=<hex hmac-sha256 of "<t>.<body>">`. Requests
// go out over https on port 443 only, without redirects, with a 10 second
// deadline, and the DNS lookup refuses private, loopback, link-local and
// metadata addresses, checked on the address actually connected to.

export const SIGNATURE_HEADER = "Latte-Signature";
const TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 4096;

export function signPayload(secret: string, timestamp: number, body: string): string {
  const mac = createHmac("sha256", secret)
    .update(`${String(timestamp)}.${body}`)
    .digest("hex");
  return `t=${String(timestamp)},v1=${mac}`;
}

/** isPublicAddress is false for anything a webhook must never reach: the machine, the LAN, the cloud. */
export function isPublicAddress(address: string): boolean {
  const v4 = isIP(address) === 4 ? address : /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (v4) {
    const [a = 0, b = 0] = v4.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  return !(
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("ff")
  );
}

type Lookup = typeof dnsLookup;

/** guardedLookup resolves like dns.lookup but fails on any address that is not public. */
export function guardedLookup(lookup: Lookup = dnsLookup): LookupFunction {
  return (hostname, options, callback) => {
    lookup(hostname, { all: true }, (err, addresses: LookupAddress[]) => {
      if (err) {
        callback(err, "", 0);
        return;
      }
      if (addresses.length === 0 || addresses.some((a) => !isPublicAddress(a.address))) {
        callback(new Error(`refused to deliver to a private address (${hostname})`), "", 0);
        return;
      }
      const first = addresses[0];
      if (options.all) callback(null, addresses);
      else callback(null, first?.address ?? "", first?.family ?? 4);
    });
  };
}

export interface PostResult {
  ok: boolean;
  status: number | null;
  error: string | null;
}

export type Post = (
  url: string,
  headers: Record<string, string>,
  body: string,
) => Promise<PostResult>;

/** httpsPost sends one delivery: https, port 443, no redirects, a 10 second deadline. */
export const httpsPost: Post = (url, headers, body) =>
  new Promise((resolve) => {
    const target = new URL(url);
    if (target.protocol !== "https:" || (target.port !== "" && target.port !== "443")) {
      resolve({ ok: false, status: null, error: "only https on port 443 is allowed" });
      return;
    }
    const req = request(
      target,
      {
        method: "POST",
        headers: { ...headers, "Content-Length": String(Buffer.byteLength(body)) },
        lookup: guardedLookup(),
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let read = 0;
        res.on("data", (chunk: Buffer) => {
          read += chunk.length;
          if (read > MAX_RESPONSE_BYTES) res.destroy();
        });
        res.on("close", () => {
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            error: status >= 200 && status < 300 ? null : `HTTP ${String(status)}`,
          });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error("timed out after 10 s"));
    });
    req.on("error", (error) => {
      resolve({ ok: false, status: null, error: error.message });
    });
    req.end(body);
  });

export interface SenderDeps {
  pool: Queryable;
  log: Logger;
  encryptionKey: string | undefined;
  post?: Post;
  now?: () => number;
}

/** deliverDue sends up to `limit` due deliveries, one at a time, and reports what happened. */
export async function deliverDue(
  deps: SenderDeps,
  limit = 25,
): Promise<{ sent: number; failed: number }> {
  const post = deps.post ?? httpsPost;
  const due = await claimDue(deps.pool, limit);
  let sent = 0;
  let failed = 0;
  for (const d of due) {
    const body = JSON.stringify(d.payload);
    let outcome: PostResult;
    try {
      const secret = decryptSecret(d.secret_ciphertext, deps.encryptionKey);
      const timestamp = Math.floor((deps.now?.() ?? Date.now()) / 1000);
      outcome = await post(
        d.url,
        {
          "Content-Type": "application/json",
          "User-Agent": "Latte-Webhooks/1.0",
          "Latte-Event": d.event_type,
          "Latte-Delivery": d.id,
          [SIGNATURE_HEADER]: signPayload(secret, timestamp, body),
        },
        body,
      );
    } catch (error) {
      outcome = {
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : "send failed",
      };
    }
    const status = await recordAttempt(
      deps.pool,
      { id: d.id, endpointId: d.endpoint_id, attempts: d.attempts },
      outcome,
    );
    if (outcome.ok) sent++;
    else failed++;
    deps.log.info(
      { deliveryId: d.id, event: d.event_type, status, http: outcome.status },
      "webhook delivery attempted",
    );
  }
  return { sent, failed };
}
