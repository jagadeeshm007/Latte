import type { LookupAddress } from "node:dns";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { guardedLookup, httpsPost, isPublicAddress, signPayload } from "./sender.ts";
import { decryptSecret, encryptSecret } from "../crypto.ts";

const KEY = "cd".repeat(32);

describe("webhook address guard", () => {
  it("refuses the machine, private networks, link-local and cloud metadata", () => {
    const blocked = [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.10",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:10.0.0.1",
    ];

    expect(blocked.filter(isPublicAddress)).toEqual([]);
    expect(["93.184.216.34", "2606:4700::1111", "172.32.0.1"].every(isPublicAddress)).toBe(true);
  });

  it("fails a lookup when any address the name resolves to is private", async () => {
    const fake = (addresses: LookupAddress[]) =>
      ((_h: string, _o: unknown, cb: (e: Error | null, a: LookupAddress[]) => void) => {
        cb(null, addresses);
      }) as never;
    const resolve = (addresses: LookupAddress[]) =>
      new Promise<string>((done) => {
        guardedLookup(fake(addresses))("hooks.example.com", {}, (err, address) => {
          done(err ? err.message : typeof address === "string" ? address : "several");
        });
      });

    expect(await resolve([{ address: "93.184.216.34", family: 4 }])).toBe("93.184.216.34");
    expect(
      await resolve([
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.5", family: 4 },
      ]),
    ).toMatch(/private address/);
  });

  it("will not post anywhere but https on port 443", async () => {
    const plain = await httpsPost("http://hooks.example.com/x", {}, "{}");
    const port = await httpsPost("https://hooks.example.com:8443/x", {}, "{}");

    expect([plain.error, port.error]).toEqual([
      "only https on port 443 is allowed",
      "only https on port 443 is allowed",
    ]);
  });

  it("signs the timestamp and body together", () => {
    expect(signPayload("whsec_x", 1700000000, '{"a":1}')).toMatch(/^t=1700000000,v1=[0-9a-f]{64}$/);
    expect(signPayload("whsec_x", 1700000000, '{"a":2}')).not.toBe(
      signPayload("whsec_x", 1700000000, '{"a":1}'),
    );
  });
});

describe("secret encryption", () => {
  it("round-trips, and refuses a changed ciphertext or a missing key", () => {
    const stored = encryptSecret("whsec_abc", KEY);
    const [v, iv, tag, body] = stored.split(".");
    const tampered = [v, iv, tag, `${body!.slice(0, -2)}AA`].join(".");

    expect(decryptSecret(stored, KEY)).toBe("whsec_abc");
    expect(() => decryptSecret(tampered, KEY)).toThrow();
    expect(() => encryptSecret("x", undefined)).toThrow(/DATA_ENCRYPTION_KEY/);
    expect(() => decryptSecret("nonsense", KEY)).toThrow(/unreadable/);
  });
});

describe("the SDKs' shared webhook test vector", () => {
  it("is signed exactly as deliveries are", () => {
    const vector = JSON.parse(
      readFileSync(
        path.resolve(import.meta.dirname, "../../../../sdks/webhook-test-vector.json"),
        "utf8",
      ),
    ) as { secret: string; timestamp: number; body: string; header: string };

    expect(signPayload(vector.secret, vector.timestamp, vector.body)).toBe(vector.header);
  });
});
