import {
  audioUrlRequestSchema,
  audioUrlSchema,
  batchDetailSchema,
  batchExportQuerySchema,
  batchListQuerySchema,
  batchListSchema,
  batchRetryResponseSchema,
  batchUpdateRequestSchema,
  callDetailSchema,
  callListQuerySchema,
  callListSchema,
  dashboardQuerySchema,
  dashboardSchema,
  errorEnvelopeSchema,
  highlightsQuerySchema,
  highlightsSchema,
  leaderboardQuerySchema,
  leaderboardSchema,
  meSchema,
  referenceSchema,
  uploadConfirmRequestSchema,
  transcriptUploadRequestSchema,
  uploadConfirmResponseSchema,
  uploadSignRequestSchema,
  uploadSignResponseSchema,
  createdWebhookSchema,
  createWebhookRequestSchema,
  updateWebhookRequestSchema,
  webhookDeliveryListSchema,
  webhookDeliveryQuerySchema,
  webhookEndpointListSchema,
  webhookEndpointSchema,
} from "@scc/shared";
import { z } from "zod";

import { API_KEY_ROUTES } from "./api-access.ts";

// The Latte API as OpenAPI 3.1, built from the same Zod schemas the API
// validates with and the same route list the API-key gate enforces, so the
// document cannot promise an endpoint a key cannot call.

interface Doc {
  summary: string;
  query?: z.ZodType;
  body?: z.ZodType;
  response?: z.ZodType;
  /** A file instead of JSON. */
  file?: string;
}

const DOCS: Record<string, Doc> = {
  "GET /me": { summary: "The manager the key acts as", response: meSchema },
  "GET /reference": {
    summary: "Agents, teams and products to upload against",
    response: referenceSchema,
  },
  "GET /calls": { summary: "List calls", query: callListQuerySchema, response: callListSchema },
  "GET /calls/:id": {
    summary: "One call with its transcript and findings",
    response: callDetailSchema,
  },
  "POST /calls/:id/audio-url": {
    summary: "A short-lived link to the recording",
    body: audioUrlRequestSchema,
    response: audioUrlSchema,
  },
  "POST /uploads/sign": {
    summary: "Signed upload URLs for up to 50 files",
    body: uploadSignRequestSchema,
    response: uploadSignResponseSchema,
  },
  "POST /uploads/confirm": {
    summary: "Create calls from uploaded files, into a new or existing batch",
    body: uploadConfirmRequestSchema,
    response: uploadConfirmResponseSchema,
  },
  "POST /uploads/transcripts": {
    summary: "Create calls from transcripts, with no audio, into a new or existing batch",
    body: transcriptUploadRequestSchema,
    response: uploadConfirmResponseSchema,
  },
  "POST /calls/:id/retry": { summary: "Queue a failed or stuck call again" },
  "POST /calls/:id/archive": { summary: "Hide a call from lists" },
  "POST /calls/:id/unarchive": { summary: "Bring an archived call back" },
  "GET /batches": {
    summary: "List batches",
    query: batchListQuerySchema,
    response: batchListSchema,
  },
  "GET /batches/:id": {
    summary: "One batch with its progress and results",
    response: batchDetailSchema,
  },
  "PATCH /batches/:id": {
    summary: "Rename or archive a batch",
    body: batchUpdateRequestSchema,
    response: batchDetailSchema,
  },
  "POST /batches/:id/retry-failed": {
    summary: "Queue every failed call in the batch again",
    response: batchRetryResponseSchema,
  },
  "GET /batches/:id/results.csv": { summary: "Results, one row per call", file: "text/csv" },
  "GET /batches/:id/export.zip": {
    summary: "Results, transcripts and recordings as a ZIP (up to 200 calls)",
    query: batchExportQuerySchema,
    file: "application/zip",
  },
  "GET /dashboard": {
    summary: "Results grouped by team, product, agent or language",
    query: dashboardQuerySchema,
    response: dashboardSchema,
  },
  "GET /dashboard/highlights": {
    summary: "The period's headline numbers and highlights",
    query: highlightsQuerySchema,
    response: highlightsSchema,
  },
  "GET /dashboard/leaderboard": {
    summary: "A sorted, paged ranking of any grouping",
    query: leaderboardQuerySchema,
    response: leaderboardSchema,
  },
  "GET /webhooks": { summary: "List webhook endpoints", response: webhookEndpointListSchema },
  "POST /webhooks": {
    summary: "Register an https endpoint; the signing secret is returned once",
    body: createWebhookRequestSchema,
    response: createdWebhookSchema,
  },
  "GET /webhooks/:id": { summary: "One webhook endpoint", response: webhookEndpointSchema },
  "PATCH /webhooks/:id": {
    summary: "Change the URL, events or description, or turn it off and on",
    body: updateWebhookRequestSchema,
    response: webhookEndpointSchema,
  },
  "DELETE /webhooks/:id": { summary: "Delete an endpoint and its deliveries" },
  "POST /webhooks/:id/test": { summary: "Send a ping event to this endpoint" },
  "GET /webhooks/:id/deliveries": {
    summary: "Deliveries to this endpoint, newest first",
    query: webhookDeliveryQuerySchema,
    response: webhookDeliveryListSchema,
  },
  "POST /webhooks/:id/deliveries/:deliveryId/redeliver": { summary: "Send a delivery again now" },
};

const json = (schema: z.ZodType) => z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });

function parameters(route: string, query: z.ZodType | undefined) {
  const path = [...route.matchAll(/:(\w+)/g)].map((m) => ({
    name: m[1],
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
  }));
  const shape = query instanceof z.ZodObject ? (query.shape as Record<string, z.ZodType>) : {};
  const fromQuery = Object.entries(shape).map(([name, s]) => ({
    name,
    in: "query",
    required: !s.safeParse(undefined).success,
    schema: json(s),
  }));
  return [...path, ...fromQuery];
}

export function openApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const rule of API_KEY_ROUTES) {
    const doc = DOCS[`${rule.method} ${rule.route}`];
    if (!doc) continue;
    const path = `/api${rule.route.replaceAll(/:(\w+)/g, "{$1}")}`;
    paths[path] ??= {};
    paths[path][rule.method.toLowerCase()] = {
      summary: doc.summary,
      ...(rule.scope ? { description: `Needs the \`${rule.scope}\` scope.` } : {}),
      "x-rate-limit-bucket": typeof rule.bucket === "function" ? "single or batch" : rule.bucket,
      parameters: parameters(rule.route, doc.query),
      ...(doc.body
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: json(doc.body) } },
            },
          }
        : {}),
      responses: {
        "200": {
          description: "OK",
          content: doc.file
            ? { [doc.file]: { schema: { type: "string", format: "binary" } } }
            : doc.response
              ? { "application/json": { schema: json(doc.response) } }
              : {},
        },
        default: {
          description: "Error: 400, 401, 403, 404, 409, 413 or 429 (with Retry-After)",
          content: { "application/json": { schema: json(errorEnvelopeSchema) } },
        },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Latte API",
      version: "1.0.0",
      description:
        'Sales call compliance and coaching. Authenticate with `Authorization: Bearer latte_…`. Every response carries RateLimit-Limit, RateLimit-Remaining and RateLimit-Reset headers. Create requests accept an `Idempotency-Key` header. Webhooks are signed with `Latte-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<body>">`.',
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        apiKey: { type: "http", scheme: "bearer", bearerFormat: "latte_<prefix>_<secret>" },
      },
    },
    security: [{ apiKey: [] }],
    paths,
  };
}
