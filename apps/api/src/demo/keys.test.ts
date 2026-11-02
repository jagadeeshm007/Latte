import { describe, expect, it } from "vitest";

import {
  DEMO_TOKEN_PREFIX,
  demoKeys,
  fingerprintOf,
  ipHashOf,
  signDemoToken,
  verifyDemoToken,
} from "./keys.ts";

const keys = demoKeys("d".repeat(32));
const signals = {
  platform: "Linux",
  language: "en-IN",
  timeZone: "Asia/Kolkata",
  screen: "1920x1080",
};
const later = (hours: number) => new Date(Date.now() + hours * 3600 * 1000);

describe("demo keys", () => {
  it("derives a separate key per use from one secret", () => {
    expect(Buffer.from(keys.token).equals(keys.fingerprint)).toBe(false);
    expect(keys.fingerprint.equals(demoKeys("e".repeat(32)).fingerprint)).toBe(false);
  });

  it("hashes a device to 64 hex characters that never contain the IP", () => {
    const hash = fingerprintOf(keys, "203.0.113.7", "Mozilla/5.0", signals);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(fingerprintOf(keys, "203.0.113.7", "Mozilla/5.0", signals));
    expect(hash).not.toBe(fingerprintOf(keys, "203.0.113.8", "Mozilla/5.0", signals));
    expect(hash).not.toBe(
      fingerprintOf(keys, "203.0.113.7", "Mozilla/5.0", { ...signals, screen: "390x844" }),
    );
    expect(ipHashOf(keys, "203.0.113.7")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not let one field's text slide into the next", () => {
    expect(fingerprintOf(keys, "1.2.3.4", "a", { ...signals, platform: "bc" })).not.toBe(
      fingerprintOf(keys, "1.2.3.4", "ab", { ...signals, platform: "c" }),
    );
  });
});

describe("demo tokens", () => {
  it("round-trips the visitor id behind the ldemo_ prefix", async () => {
    const token = await signDemoToken(keys, "11111111-1111-4111-8111-111111111111", later(24));

    expect(token.startsWith(DEMO_TOKEN_PREFIX)).toBe(true);
    await expect(verifyDemoToken(keys, token)).resolves.toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("refuses a token signed with another secret, expired, or without the prefix", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const other = await signDemoToken(demoKeys("x".repeat(32)), id, later(1));
    const expired = await signDemoToken(keys, id, later(-1));
    const bare = (await signDemoToken(keys, id, later(1))).slice(DEMO_TOKEN_PREFIX.length);

    await expect(verifyDemoToken(keys, other)).rejects.toThrow(/demo session/);
    await expect(verifyDemoToken(keys, expired)).rejects.toThrow(/demo session/);
    await expect(verifyDemoToken(keys, bare)).rejects.toThrow(/demo session/);
  });
});
