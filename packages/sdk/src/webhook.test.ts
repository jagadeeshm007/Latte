import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyWebhookSignature } from "./webhook.ts";

const secret = "whsec_test";
const body = '{"id":"e1","type":"call.scored"}';
const now = () => 1_700_000_100_000;
const header = (t: number, b = body) =>
  `t=${String(t)},v1=${createHmac("sha256", secret)
    .update(`${String(t)}.${b}`)
    .digest("hex")}`;

describe("verifyWebhookSignature", () => {
  it("accepts a delivery Latte signed a moment ago", async () => {
    expect(await verifyWebhookSignature({ secret, header: header(1_700_000_000), body, now })).toBe(
      true,
    );
  });

  it("refuses a changed body, an old delivery, another secret and a mangled header", async () => {
    const results = await Promise.all([
      verifyWebhookSignature({ secret, header: header(1_700_000_000), body: `${body} `, now }),
      verifyWebhookSignature({ secret, header: header(1_699_999_000), body, now }),
      verifyWebhookSignature({ secret: "whsec_other", header: header(1_700_000_000), body, now }),
      verifyWebhookSignature({ secret, header: "t=abc,v1=xyz", body, now }),
      verifyWebhookSignature({ secret, header: undefined, body, now }),
    ]);

    expect(results).toEqual([false, false, false, false, false]);
  });
});
