---
title: SDKs
description: Clients for TypeScript, Python, Go and Java, how to install them pinned or at the newest release, and other languages from openapi.json.
section: SDKs
order: 30
---

# SDKs

## TypeScript: @latte/sdk

A zero-dependency client, about 16 kB, using `fetch` and Web Crypto. It runs on Node 20 or later, Bun, Deno, Cloudflare Workers and other edge runtimes, and ships types for every request and response.

Install a pinned release (recommended for production):

```bash
npm install https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.3.0/latte-sdk-0.3.0.tgz
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

## Python, Go and Java

Generated from the API's OpenAPI document and released with the TypeScript SDK under the same version. Each has the endpoints as methods named by their `operationId`, a model for every schema, and a webhook signature check.

### Python

Python 3.10 or later.

```bash
pip install "git+https://github.com/jagadeeshm007/Latte@sdk-v0.3.0#subdirectory=sdks/python"   # pinned
pip install "git+https://github.com/jagadeeshm007/Latte@sdk-latest#subdirectory=sdks/python"   # newest
```

```python
import os

import latte_sdk

config = latte_sdk.Configuration(host="https://your-latte-domain", access_token=os.environ["LATTE_API_KEY"])
with latte_sdk.ApiClient(config) as client:
    calls = latte_sdk.CallsApi(client).list_calls(status="scored", limit=20)
```

### Go

```bash
go get github.com/jagadeeshm007/Latte/sdks/go@v0.3.0   # pinned
go get github.com/jagadeeshm007/Latte/sdks/go@latest   # newest
```

```go
cfg := latte.NewConfiguration()
cfg.Servers = latte.ServerConfigurations{{URL: "https://your-latte-domain"}}
client := latte.NewAPIClient(cfg)
ctx := context.WithValue(context.Background(), latte.ContextAccessToken, os.Getenv("LATTE_API_KEY"))
calls, _, err := client.CallsAPI.ListCalls(ctx).Status("scored").Limit(20).Execute()
```

`latte.VerifyWebhookSignature(secret, header, body, time.Now())` checks a delivery.

### Java

Java 11 or later. Each release carries `latte-sdk-<version>.jar` and its pom (the newest at `releases/latest/download/latte-sdk.jar`):

```bash
curl -LO https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.3.0/latte-sdk-0.3.0.jar
curl -LO https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.3.0/latte-sdk-0.3.0.pom
mvn install:install-file -Dfile=latte-sdk-0.3.0.jar -DpomFile=latte-sdk-0.3.0.pom
```

```java
ApiClient client = new ApiClient();
client.updateBaseUri("https://your-latte-domain");
client.setRequestInterceptor(r -> r.header("Authorization", "Bearer " + System.getenv("LATTE_API_KEY")));
CallList calls = new CallsApi(client).listCalls(
    CallsApi.APIListCallsRequest.newBuilder().status("scored").limit(20).build());
```

`Webhook.verifySignature(secret, header, rawBody)` checks a delivery.

## Other languages

The OpenAPI 3.1 document at [`/openapi.json`](/openapi.json) has an `operationId` on every endpoint and a named schema for every body, so any OpenAPI generator makes a typed client from it:

```bash
curl -sO https://your-latte-domain/openapi.json
docker run --rm -v "$PWD:/local" openapitools/openapi-generator-cli:v7.26.0 generate \
  -i /local/openapi.json -g csharp -o /local/latte-csharp
```

Set the client's bearer token to your API key. The webhook signature check is a few lines in any language; see [Webhooks](webhooks.md#checking-the-signature).
