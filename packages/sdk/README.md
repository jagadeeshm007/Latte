# @latte/sdk

TypeScript client for the Latte API (ADR-0019). Needs Node 18 or later. The
full guide is in the app under Developers > Docs, and in
[docs/api/guide.md](../../docs/api/guide.md).

```ts
import { LatteClient } from "@latte/sdk";

const latte = new LatteClient({
  apiKey: process.env.LATTE_API_KEY!,
  baseUrl: "https://latte.example.com",
});

// Upload a batch in chunks; failed files come back in `failed`, the rest carry on.
const batch = await latte.batches.create(files, {
  name: "Inbound, 16 Oct",
  onProgress: console.log,
});
const done = await latte.batches.wait(batch.batchId!);
const csv = await latte.batches.resultsCsv(done.id);
```

Create a key under Developers in the app, with only the scopes the integration needs.

## Methods

| Namespace   | Methods                                                                             | Scope                                                                 |
| ----------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| (client)    | `me()`, `reference()`                                                               | none for `me()`, `calls:read` for `reference()`                       |
| `calls`     | `list`, `get`, `audioUrl`, `upload`, `retry`, `archive`, `unarchive`                | `calls:read`, `calls:write`                                           |
| `batches`   | `list`, `get`, `create`, `wait`, `update`, `retryFailed`, `resultsCsv`, `exportZip` | `batches:read`, `batches:write`; `exports:read` for the two downloads |
| `analytics` | `dashboard`, `highlights`, `leaderboard`                                            | `analytics:read`                                                      |
| `webhooks`  | `list`, `get`, `create`, `update`, `delete`, `test`, `deliveries`, `redeliver`      | `webhooks:write`                                                      |

## Behaviour

- **Retries.** A 429 is retried after `Retry-After` (three times by default, `maxRetries`). Server errors and dropped connections are retried on reads always, and on writes only when the write carries an idempotency key.
- **Idempotency.** Writes take `{ idempotencyKey }`. The same key replays the first response for 24 hours; the same key with a different body is refused with 422. `calls.upload` sets one for you from the file's storage path.
- **Errors.** Errors are `ApiError` (or `RateLimitError`) with the server's `code` and `requestId`. Quote the request id when asking for help.
- **Personal data.** Transcripts and quotes come back with card numbers, phone numbers, Aadhaar, PAN, IFSC, account numbers and email addresses masked. `callDetail.redactions` says how many spans were masked. Keys never receive the unmasked text.

## Webhooks

Check every delivery before trusting it. Pass the raw body, not parsed JSON:

```ts
import { verifyWebhookSignature } from "@latte/sdk";

app.post("/latte", express.text({ type: "application/json" }), (req, res) => {
  const ok = verifyWebhookSignature({
    secret: process.env.LATTE_WEBHOOK_SECRET!,
    header: req.header("Latte-Signature"),
    body: req.body,
  });
  if (!ok) return res.status(400).end();
  const event = JSON.parse(req.body);
  // event.type is call.scored, call.failed, batch.completed, alert.triggered or digest.ready
  res.status(204).end();
});
```

Deliveries older than five minutes fail the check (`toleranceSeconds`). Use the
`Latte-Delivery` header to drop a redelivery you have already handled.

## Reference

The full API is described at `/api/openapi.json`.
