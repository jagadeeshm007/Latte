# @latte/sdk

TypeScript client for the Latte API (ADR-0019). Needs Node 18 or later.

```ts
import { LatteClient } from "@latte/sdk";

const latte = new LatteClient({
  apiKey: process.env.LATTE_API_KEY!,
  baseUrl: "https://api.example",
});

// Upload a batch in chunks; failed files come back in `failed`, the rest carry on.
const batch = await latte.batches.create(files, {
  name: "Inbound, 16 Oct",
  onProgress: console.log,
});
const done = await latte.batches.wait(batch.batchId!);
const csv = await latte.batches.resultsCsv(done.id);
```

- Create a key under Developers in the app, with only the scopes the integration needs.
- **Retries.** A 429 is retried after `Retry-After` (three times by default, `maxRetries`). Server errors and dropped connections are retried on reads only; a write may already have landed.
- **Errors.** Errors are `ApiError` (or `RateLimitError`) with the server's `code` and `requestId`. Quote the request id when asking for help.
- **Reference.** The full API is described at `/api/openapi.json`.
