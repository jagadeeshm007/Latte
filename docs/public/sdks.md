---
title: SDKs
description: The TypeScript SDK, and clients for Python, Go, Java and other languages from openapi.json.
section: SDKs
order: 30
---

# SDKs

## TypeScript: @latte/sdk

A zero-dependency client, about 16 kB, using `fetch` and Web Crypto. It runs on Node 20 or later, Bun, Deno, Cloudflare Workers and other edge runtimes, and ships types for every request and response.

Install a pinned release (recommended for production):

```bash
npm install https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.2.0/latte-sdk-0.2.0.tgz
```

Or whatever is newest:

```bash
npm install https://github.com/jagadeeshm007/Latte/releases/latest/download/latte-sdk.tgz
```

The same URLs work with `pnpm add` and `yarn add`.

```ts
import { LatteClient } from "@latte/sdk";

const latte = new LatteClient({ apiKey: process.env.LATTE_API_KEY!, baseUrl: "https://your-latte-domain" });
```

| Namespace | Methods | Scopes |
| --- | --- | --- |
| client | `me()`, `reference()` | none, `calls:read` |
| `calls` | `list`, `get`, `audioUrl`, `upload`, `uploadTranscript`, `retry`, `archive`, `unarchive` | `calls:read`, `calls:write` |
| `batches` | `list`, `get`, `create`, `createFromTranscripts`, `wait`, `update`, `retryFailed`, `resultsCsv`, `exportZip` | `batches:read`, `batches:write`, `exports:read` |
| `analytics` | `dashboard`, `highlights`, `leaderboard` | `analytics:read` |
| `webhooks` | `list`, `get`, `create`, `update`, `delete`, `test`, `deliveries`, `redeliver` | `webhooks:write` |

Also exported: `verifyWebhookSignature`, `parseTranscript`, `ApiError`, `RateLimitError`, `TranscriptParseError`.

Behaviour:

- **Retries.** A 429 is retried after `Retry-After`, three times by default (`maxRetries`). Server errors and dropped connections are retried on reads, and on writes only when they carry an idempotency key.
- **Idempotency.** Writes take `{ idempotencyKey }`; `calls.upload` sets one from the storage path.
- **Errors.** Failures throw `ApiError` (or `RateLimitError`) with the server's `code` and `requestId`.
- **Types, not run-time checks.** Responses are typed from the API's own schemas and are not validated at run time, which keeps the SDK small.

## Python, Go, Java and others

The API is described by an OpenAPI 3.1 document at [`/openapi.json`](/openapi.json), with an `operationId` on every endpoint and a named schema for every body. Any OpenAPI generator turns it into a typed client. With the official OpenAPI Generator image:

```bash
curl -sO https://your-latte-domain/openapi.json
docker run --rm -v "$PWD:/local" openapitools/openapi-generator-cli generate \
  -i /local/openapi.json -g python -o /local/latte-python
```

Use `-g go` or `-g java` for those languages. Set the client's bearer token to your API key. The signature check for webhooks is a few lines in each language; see [Webhooks](webhooks.md#checking-the-signature).
