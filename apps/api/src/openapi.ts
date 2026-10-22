import {
  audioUrlRequestSchema,
  audioUrlSchema,
  batchDetailSchema,
  batchExportQuerySchema,
  batchListQuerySchema,
  batchListSchema,
  batchRetryResponseSchema,
  batchSchema,
  batchUpdateRequestSchema,
  callDetailSchema,
  callListQuerySchema,
  callListSchema,
  callSummarySchema,
  createdWebhookSchema,
  createWebhookRequestSchema,
  dashboardQuerySchema,
  dashboardSchema,
  errorEnvelopeSchema,
  findingSchema,
  highlightsQuerySchema,
  highlightsSchema,
  leaderboardQuerySchema,
  leaderboardSchema,
  meSchema,
  referenceSchema,
  segmentSchema,
  transcriptLineSchema,
  transcriptUploadRequestSchema,
  updateWebhookRequestSchema,
  uploadConfirmRequestSchema,
  uploadConfirmResponseSchema,
  uploadSignRequestSchema,
  uploadSignResponseSchema,
  WEBHOOK_EVENTS,
  webhookDeliveryListSchema,
  webhookDeliveryQuerySchema,
  webhookDeliverySchema,
  webhookEndpointListSchema,
  webhookEndpointSchema,
  webhookEnvelopeSchema,
  webhookEventDataSchemas,
  type WebhookEvent,
} from "@scc/shared";
import { z } from "zod";

import { API_KEY_ROUTES } from "./api-access.ts";
import sdkPackage from "../../../packages/sdk/package.json" with { type: "json" };

// The Latte API as OpenAPI 3.1, built from the same Zod schemas the API
// validates with and the same route list the API-key gate enforces, so the
// document cannot promise an endpoint a key cannot call. Every operation has
// an operationId and a tag, and every body and response is a named schema,
// so clients generated from it (Python, Go, Java) get real names
// (ADR-0018, ADR-0031). It is also the source of the public API reference.

type Tag = "Account" | "Calls" | "Uploads" | "Batches" | "Exports" | "Analytics" | "Webhooks";

interface Doc {
  operationId: string;
  tag: Tag;
  summary: string;
  description?: string;
  /** The success status; 200 when not given. */
  status?: 200 | 201 | 202 | 204;
  query?: z.ZodType;
  body?: z.ZodType;
  response?: z.ZodType;
  /** A file instead of JSON. */
  file?: string;
}

const TAGS: { name: Tag; description: string }[] = [
  {
    name: "Account",
    description: "Who the key acts as, and the agents, teams and products to upload against.",
  },
  { name: "Calls", description: "Calls with their transcript, score and findings." },
  {
    name: "Uploads",
    description:
      "Add calls: sign upload URLs for recordings and confirm them, or send transcripts with no audio.",
  },
  { name: "Batches", description: "Calls uploaded together, with their progress and results." },
  {
    name: "Exports",
    description: "Batch results as CSV, and transcripts and recordings as a ZIP.",
  },
  {
    name: "Analytics",
    description: "Scores and flags grouped by team, product, agent or language.",
  },
  {
    name: "Webhooks",
    description:
      "Endpoints that receive signed events. The events themselves are described under `webhooks`.",
  },
];

const retryResponseSchema = z.object({ status: z.literal("queued") });
const queuedSchema = z.object({ queued: z.number().int() });

const DOCS: Record<string, Doc> = {
  "GET /me": {
    operationId: "getMe",
    tag: "Account",
    summary: "The manager the key acts as",
    response: meSchema,
  },
  "GET /reference": {
    operationId: "getReference",
    tag: "Account",
    summary: "Agents, teams and products to upload against",
    response: referenceSchema,
  },
  "GET /calls": {
    operationId: "listCalls",
    tag: "Calls",
    summary: "List calls",
    description:
      "Filter by status, flag, agent, team, product, language, batch or text. Paged with `limit` and `page`, or `cursor`.",
    query: callListQuerySchema,
    response: callListSchema,
  },
  "GET /calls/{id}": {
    operationId: "getCall",
    tag: "Calls",
    summary: "One call with its transcript and findings",
    description: "Personal data in the transcript and quotes is masked for API keys.",
    response: callDetailSchema,
  },
  "POST /calls/{id}/audio-url": {
    operationId: "getAudioUrl",
    tag: "Calls",
    summary: "A short-lived link to the recording",
    body: audioUrlRequestSchema,
    response: audioUrlSchema,
  },
  "POST /uploads/sign": {
    operationId: "signUploads",
    tag: "Uploads",
    summary: "Signed upload URLs for up to 50 recordings",
    description:
      "PUT each file to its `signedUrl`, then call confirmUploads with the returned paths.",
    body: uploadSignRequestSchema,
    response: uploadSignResponseSchema,
  },
  "POST /uploads/confirm": {
    operationId: "confirmUploads",
    tag: "Uploads",
    summary: "Create calls from uploaded recordings, into a new or existing batch",
    description: "Accepts an `Idempotency-Key` header.",
    status: 201,
    body: uploadConfirmRequestSchema,
    response: uploadConfirmResponseSchema,
  },
  "POST /uploads/transcripts": {
    operationId: "uploadTranscripts",
    tag: "Uploads",
    summary: "Create calls from transcripts, with no audio, into a new or existing batch",
    description:
      "Give times on every line or on none; without times, findings point to line numbers. Accepts an `Idempotency-Key` header.",
    status: 201,
    body: transcriptUploadRequestSchema,
    response: uploadConfirmResponseSchema,
  },
  "POST /calls/{id}/retry": {
    operationId: "retryCall",
    tag: "Calls",
    summary: "Queue a failed or stuck call again",
    status: 202,
    response: retryResponseSchema,
  },
  "POST /calls/{id}/archive": {
    operationId: "archiveCall",
    tag: "Calls",
    summary: "Hide a call from lists",
    status: 204,
  },
  "POST /calls/{id}/unarchive": {
    operationId: "unarchiveCall",
    tag: "Calls",
    summary: "Bring an archived call back",
    status: 204,
  },
  "GET /batches": {
    operationId: "listBatches",
    tag: "Batches",
    summary: "List batches",
    query: batchListQuerySchema,
    response: batchListSchema,
  },
  "GET /batches/{id}": {
    operationId: "getBatch",
    tag: "Batches",
    summary: "One batch with its progress and results",
    response: batchDetailSchema,
  },
  "PATCH /batches/{id}": {
    operationId: "updateBatch",
    tag: "Batches",
    summary: "Rename or archive a batch",
    body: batchUpdateRequestSchema,
    response: batchDetailSchema,
  },
  "POST /batches/{id}/retry-failed": {
    operationId: "retryFailedCalls",
    tag: "Batches",
    summary: "Queue every failed call in the batch again",
    description: "Accepts an `Idempotency-Key` header.",
    status: 202,
    response: batchRetryResponseSchema,
  },
  "GET /batches/{id}/results.csv": {
    operationId: "getBatchResultsCsv",
    tag: "Exports",
    summary: "Results, one row per call and one column per rubric item",
    file: "text/csv",
  },
  "GET /batches/{id}/export.zip": {
    operationId: "exportBatchZip",
    tag: "Exports",
    summary: "Results, transcripts and recordings as a ZIP (up to 200 calls)",
    query: batchExportQuerySchema,
    file: "application/zip",
  },
  "GET /dashboard": {
    operationId: "getDashboard",
    tag: "Analytics",
    summary: "Results grouped by team, product, agent or language",
    query: dashboardQuerySchema,
    response: dashboardSchema,
  },
  "GET /dashboard/highlights": {
    operationId: "getHighlights",
    tag: "Analytics",
    summary: "The period's headline numbers and highlights",
    query: highlightsQuerySchema,
    response: highlightsSchema,
  },
  "GET /dashboard/leaderboard": {
    operationId: "getLeaderboard",
    tag: "Analytics",
    summary: "A sorted, paged ranking of any grouping",
    query: leaderboardQuerySchema,
    response: leaderboardSchema,
  },
  "GET /webhooks": {
    operationId: "listWebhooks",
    tag: "Webhooks",
    summary: "List webhook endpoints",
    response: webhookEndpointListSchema,
  },
  "POST /webhooks": {
    operationId: "createWebhook",
    tag: "Webhooks",
    summary: "Register an https endpoint; the signing secret is returned once",
    description: "Accepts an `Idempotency-Key` header.",
    status: 201,
    body: createWebhookRequestSchema,
    response: createdWebhookSchema,
  },
  "GET /webhooks/{id}": {
    operationId: "getWebhook",
    tag: "Webhooks",
    summary: "One webhook endpoint",
    response: webhookEndpointSchema,
  },
  "PATCH /webhooks/{id}": {
    operationId: "updateWebhook",
    tag: "Webhooks",
    summary: "Change the URL, events or description, or turn it off and on",
    body: updateWebhookRequestSchema,
    response: webhookEndpointSchema,
  },
  "DELETE /webhooks/{id}": {
    operationId: "deleteWebhook",
    tag: "Webhooks",
    summary: "Delete an endpoint and its deliveries",
    status: 204,
  },
  "POST /webhooks/{id}/test": {
    operationId: "testWebhook",
    tag: "Webhooks",
    summary: "Send a ping event to this endpoint",
    status: 202,
    response: queuedSchema,
  },
  "GET /webhooks/{id}/deliveries": {
    operationId: "listWebhookDeliveries",
    tag: "Webhooks",
    summary: "Deliveries to this endpoint, newest first",
    query: webhookDeliveryQuerySchema,
    response: webhookDeliveryListSchema,
  },
  "POST /webhooks/{id}/deliveries/{deliveryId}/redeliver": {
    operationId: "redeliverWebhookDelivery",
    tag: "Webhooks",
    summary: "Send a delivery again now",
    status: 202,
    response: queuedSchema,
  },
};

/** The OpenAPI path of an API_KEY_ROUTES route: `/calls/:id` is `/calls/{id}`. */
export const openApiPath = (route: string) => route.replaceAll(/:(\w+)/g, "{$1}");

const EVENT_NAME: Record<WebhookEvent, string> = {
  "call.scored": "CallScored",
  "call.failed": "CallFailed",
  "batch.completed": "BatchCompleted",
  "alert.triggered": "AlertTriggered",
  "digest.ready": "DigestReady",
  ping: "Ping",
};

const EVENTS: WebhookEvent[] = [...WEBHOOK_EVENTS, "ping"];

// Responses read as the API sends them; request bodies as a client writes them.
const responses = z.registry<{ id: string }>();
const requests = z.registry<{ id: string }>();
for (const [id, schema] of [
  ["Me", meSchema],
  ["Reference", referenceSchema],
  ["CallSummary", callSummarySchema],
  ["CallList", callListSchema],
  ["Segment", segmentSchema],
  ["Finding", findingSchema],
  ["CallDetail", callDetailSchema],
  ["AudioUrl", audioUrlSchema],
  ["CallRetryResponse", retryResponseSchema],
  ["UploadSignResponse", uploadSignResponseSchema],
  ["UploadResult", uploadConfirmResponseSchema],
  ["BatchSummary", batchSchema],
  ["BatchList", batchListSchema],
  ["BatchDetail", batchDetailSchema],
  ["BatchRetryResponse", batchRetryResponseSchema],
  ["Dashboard", dashboardSchema],
  ["Highlights", highlightsSchema],
  ["Leaderboard", leaderboardSchema],
  ["WebhookEndpoint", webhookEndpointSchema],
  ["WebhookEndpointList", webhookEndpointListSchema],
  ["CreatedWebhook", createdWebhookSchema],
  ["WebhookDelivery", webhookDeliverySchema],
  ["WebhookDeliveryList", webhookDeliveryListSchema],
  ["Queued", queuedSchema],
  ["Error", errorEnvelopeSchema],
] as const) {
  responses.add(schema, { id });
}
for (const event of EVENTS) {
  responses.add(webhookEventDataSchemas[event], { id: `${EVENT_NAME[event]}Data` });
}
const envelopes = new Map(EVENTS.map((event) => [event, webhookEnvelopeSchema(event)]));
for (const [event, schema] of envelopes) {
  responses.add(schema, { id: `${EVENT_NAME[event]}Event` });
}
for (const [id, schema] of [
  ["AudioUrlRequest", audioUrlRequestSchema],
  ["UploadSignRequest", uploadSignRequestSchema],
  ["UploadConfirmRequest", uploadConfirmRequestSchema],
  ["TranscriptLine", transcriptLineSchema],
  ["TranscriptUploadRequest", transcriptUploadRequestSchema],
  ["BatchUpdateRequest", batchUpdateRequestSchema],
  ["CreateWebhookRequest", createWebhookRequestSchema],
  ["UpdateWebhookRequest", updateWebhookRequestSchema],
] as const) {
  requests.add(schema, { id });
}

const uri = (id: string) => `#/components/schemas/${id}`;
const ref = (registry: z.core.$ZodRegistry<{ id: string }>, schema: z.ZodType) => {
  const id = registry.get(schema)?.id;
  if (!id) throw new Error("every body and response in DOCS must be a named schema");
  return { $ref: uri(id) };
};

/** The named schemas, without the $schema and $id keys JSON Schema adds. */
function components(registry: z.core.$ZodRegistry<{ id: string }>, io: "input" | "output") {
  const { schemas } = z.toJSONSchema(registry, { io, uri, unrepresentable: "any" }) as {
    schemas: Record<string, Record<string, unknown>>;
  };
  return Object.fromEntries(
    Object.entries(schemas).map(([id, { $schema: _s, $id: _i, ...schema }]) => [id, schema]),
  );
}

const inline = (schema: z.ZodType) => {
  const { $schema: _s, ...rest } = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
  return rest;
};

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
    schema: inline(s),
  }));
  return [...path, ...fromQuery];
}

function success(doc: Doc) {
  const status = String(doc.status ?? 200);
  if (doc.file) {
    return {
      [status]: {
        description: "The file",
        content: { [doc.file]: { schema: { type: "string", format: "binary" } } },
      },
    };
  }
  if (!doc.response) return { [status]: { description: "Done; no body" } };
  return {
    [status]: {
      description: "OK",
      content: { "application/json": { schema: ref(responses, doc.response) } },
    },
  };
}

const SIGNATURE_HEADERS = [
  {
    name: "Latte-Signature",
    in: "header",
    required: true,
    description:
      't=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>"> under the endpoint\'s whsec_ secret',
    schema: { type: "string" },
  },
  {
    name: "Latte-Event",
    in: "header",
    required: true,
    description: "The event type",
    schema: { type: "string" },
  },
  {
    name: "Latte-Delivery",
    in: "header",
    required: true,
    description: "The delivery id; the same on a redelivery, so use it to drop duplicates",
    schema: { type: "string" },
  },
];

function webhooks() {
  return Object.fromEntries(
    EVENTS.map((event) => {
      const envelope = envelopes.get(event);
      if (!envelope) throw new Error(`no envelope for ${event}`);
      return [
        event,
        {
          post: {
            operationId: `on${EVENT_NAME[event]}`,
            tags: ["Webhooks"],
            summary: webhookEventDataSchemas[event].description ?? event,
            description:
              "Answer 2xx within 10 seconds. Anything else is retried 8 times over about a day; after 50 failures in a row the endpoint is turned off.",
            parameters: SIGNATURE_HEADERS,
            requestBody: {
              required: true,
              content: { "application/json": { schema: ref(responses, envelope) } },
            },
            responses: { "200": { description: "Received" } },
          },
        },
      ];
    }),
  );
}

export function openApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const rule of API_KEY_ROUTES) {
    const key = `${rule.method} ${openApiPath(rule.route)}`;
    const doc = DOCS[key];
    if (!doc) continue;
    const path = `/api${openApiPath(rule.route)}`;
    paths[path] ??= {};
    paths[path][rule.method.toLowerCase()] = {
      operationId: doc.operationId,
      tags: [doc.tag],
      summary: doc.summary,
      description: [doc.description, rule.scope ? `Needs the \`${rule.scope}\` scope.` : null]
        .filter(Boolean)
        .join(" "),
      "x-rate-limit-bucket": typeof rule.bucket === "function" ? "single or batch" : rule.bucket,
      parameters: parameters(rule.route, doc.query),
      ...(doc.body
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: ref(requests, doc.body) } },
            },
          }
        : {}),
      responses: {
        ...success(doc),
        default: {
          description: "Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After)",
          content: { "application/json": { schema: { $ref: uri("Error") } } },
        },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Latte API",
      version: sdkPackage.version,
      description:
        "Sales call compliance and coaching. Authenticate with `Authorization: Bearer latte_…`. Every response carries RateLimit-Limit, RateLimit-Remaining and RateLimit-Reset headers. Create requests accept an `Idempotency-Key` header. Webhooks are signed with `Latte-Signature`; see the `webhooks` section.",
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: "/" }],
    tags: TAGS,
    components: {
      schemas: { ...components(responses, "output"), ...components(requests, "input") },
      securitySchemes: {
        apiKey: { type: "http", scheme: "bearer", bearerFormat: "latte_<prefix>_<secret>" },
      },
    },
    security: [{ apiKey: [] }],
    paths,
    webhooks: webhooks(),
  };
}

/** For tests: the documented operations, keyed "METHOD /path". */
export const documentedOperations = () => Object.keys(DOCS);
