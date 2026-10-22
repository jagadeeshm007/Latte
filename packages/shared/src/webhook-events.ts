import { z } from "zod";

import { ALERT_METRICS, ALERT_SCOPES, highlightsSchema, type WebhookEvent } from "./api.ts";

// What each webhook event carries (ADR-0021). The API's emitEvent is typed
// against these, so a payload cannot change without its documentation in
// the OpenAPI `webhooks` section changing with it.

const uuid = z.string();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export const webhookEventDataSchemas = {
  "call.scored": z
    .object({
      callId: uuid,
      batchId: uuid,
      agentId: uuid,
      teamId: uuid,
      productId: uuid,
      overallScore: z.number().nullable().describe("0 to 100; null when the judge could not score"),
      needsReview: z.boolean().nullable().describe("true when QA should look at the call"),
      judgeStatus: z.string().nullable().describe("ok, or why the judge failed"),
      breaches: z.number().int().describe("prohibited statements found"),
    })
    .describe("A call has its score and findings."),
  "call.failed": z
    .object({ callId: uuid, reason: z.string().describe("why processing gave up, for a person") })
    .describe("A call could not be processed; retry it once the reason is fixed."),
  "batch.completed": z
    .object({
      batchId: uuid,
      name: z.string(),
      total: z.number().int(),
      scored: z.number().int(),
      failed: z.number().int(),
    })
    .describe("Every call in a batch is scored or failed."),
  "alert.triggered": z
    .object({
      ruleId: uuid,
      ruleName: z.string(),
      metric: z.enum(ALERT_METRICS),
      scope: z.enum(ALERT_SCOPES),
      itemKey: z.string().nullable().describe("the rubric item, for an item fail-rate rule"),
      groupId: z.string(),
      groupName: z.string(),
      value: z.number().describe("the metric over the recent window"),
      baseline: z.number().describe("the metric over the baseline window"),
      calls: z.number().int(),
    })
    .describe("An alert rule fired for a team, product or agent."),
  "digest.ready": z
    .object({
      frequency: z.enum(["daily", "weekly"]),
      from: isoDate,
      to: isoDate,
      kpis: highlightsSchema.shape.kpis,
    })
    .describe("A daily or weekly digest was built."),
  ping: z
    .object({ message: z.string() })
    .describe("A test event, sent from the endpoint page or the API."),
} satisfies Record<WebhookEvent, z.ZodType>;

/** The data of each event, as the API sends it. */
export type WebhookEventData = {
  [K in WebhookEvent]: z.input<(typeof webhookEventDataSchemas)[K]>;
};

/** The envelope every delivery's body is: an id to drop duplicates by, the type, when, and the data. */
export function webhookEnvelopeSchema<K extends WebhookEvent>(type: K) {
  return z.object({
    id: z.string().describe("the event id; the same on every redelivery"),
    type: z.literal(type),
    createdAt: z.string().describe("ISO 8601"),
    data: webhookEventDataSchemas[type],
  });
}
