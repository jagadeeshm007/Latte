import { describe, expect, it } from "vitest";

import { webhookEnvelopeSchema, webhookEventDataSchemas } from "./webhook-events.ts";

describe("webhook event schemas", () => {
  it("accepts a call.scored delivery as the API sends it", () => {
    const body = {
      id: "evt_1",
      type: "call.scored",
      createdAt: "2026-10-22T10:00:00.000Z",
      data: {
        callId: "c1",
        batchId: "b1",
        agentId: "a1",
        teamId: "t1",
        productId: "p1",
        overallScore: 82,
        needsReview: false,
        judgeStatus: "ok",
        breaches: 0,
      },
    };

    expect(webhookEnvelopeSchema("call.scored").parse(body)).toEqual(body);
  });

  it("refuses an envelope whose type does not match", () => {
    expect(
      webhookEnvelopeSchema("ping").safeParse({
        id: "e",
        type: "call.failed",
        createdAt: "x",
        data: { message: "hi" },
      }).success,
    ).toBe(false);
  });

  it("keeps digest dates as YYYY-MM-DD", () => {
    const digest = webhookEventDataSchemas["digest.ready"];

    expect(digest.shape.from.safeParse("2026-10-22").success).toBe(true);
    expect(digest.shape.from.safeParse("22/10/2026").success).toBe(false);
  });
});
