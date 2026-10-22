# Latte API guide

For developers connecting a CRM, dialler or data pipeline to Latte. The same
content is in the app under Developers > Docs. The machine-readable reference
is `GET /api/openapi.json`; the TypeScript client is `@latte/sdk`
([packages/sdk/README.md](../../packages/sdk/README.md)), installed straight from a
GitHub release:

```bash
npm install https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.1.0/latte-sdk-0.1.0.tgz
```

## Authentication

A manager creates a key under Developers > API keys. The secret looks like
`latte_<prefix>_<secret>` and is shown once. Send it as a bearer token:

```bash
curl -H "Authorization: Bearer $LATTE_API_KEY" https://latte.example.com/api/me
```

A key acts as the manager who created it (ADR-0018). It stops working when it
is revoked, when it expires, or when its creator stops being a manager.
Rotating a key makes a successor with the same name, scopes and limits; the
old key keeps working for 24 hours so deployments can switch over.

## Scopes

| Scope | Allows |
| --- | --- |
| `calls:read` | list and read calls, the reference data, signed audio links |
| `calls:write` | upload calls, retry, archive and unarchive |
| `batches:read` | list and read batches |
| `batches:write` | rename and archive batches, retry a batch's failed calls |
| `exports:read` | a batch's results CSV and export ZIP |
| `analytics:read` | the dashboard, highlights and leaderboard |
| `webhooks:write` | manage webhook endpoints and their deliveries |

Routes outside this list (reviews, rubrics, spend, members, billing, key
management) answer `403 not_for_api_keys`. A missing scope answers
`403 insufficient_scope`.

## Rate limits

Requests are counted per key and bucket in fixed windows.

| Bucket | Default | Used by |
| --- | --- | --- |
| read | 600 per minute | every GET except exports |
| single | 60 per minute | one-call writes, webhook writes, one-file uploads |
| batch | 20 per minute | multi-file uploads, retry a batch's failures |
| bulk | 10 per hour | results CSV, export ZIP |

Every response carries `RateLimit-Limit`, `RateLimit-Remaining`,
`RateLimit-Reset` and `RateLimit-Policy`. A 429 also carries `Retry-After`.
Refused requests count too, so a client looping on 403 runs into its limit.

## Errors and request ids

Errors are JSON: `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
Every response has an `X-Request-Id` header; you may send your own (letters,
digits, `-` and `_`, up to 64). The request log under each key shows the
route, status, duration and request id, never the body.

## Idempotency

Send `Idempotency-Key: <your id>` on a create to make retrying safe. It is
honoured on upload confirm, key and webhook creation, retry-failed, saved
views and alert rules.

- The same key and body within 24 hours replays the first response.
- The same key with a different body answers `422 idempotency_key_reused`.
- A retry while the first request is still running answers `409 idempotency_in_progress`.

The stored response is written after the handler, so a crash between the two
can leave a key unrecorded; upload confirm keeps its own uniqueness check as
the hard guard (ADR-0022).

## Pagination

Lists take `limit` (at most 100) and answer `items` with a `total`. Calls also
answer `nextCursor`: pass it back as `cursor` for the next page, which stays
stable while new calls arrive. Batches and the other lists take `page`.

## Uploading calls

1. `POST /api/uploads/sign` with the file names, sizes and types returns a
   signed upload URL per file.
2. PUT each file to its URL.
3. `POST /api/uploads/confirm` with the storage paths and what each call is
   about (agent, team, product, language). Several files make one batch.

`latte.batches.create(files)` does all three, in chunks of up to 50 files.

## Uploading transcripts

A call can also be uploaded as a transcript, with no audio. `POST /api/uploads/transcripts` takes up to 50 transcripts, each with the same details as a recording and its lines:

```json
{
  "batchName": "Dialler export",
  "transcripts": [
    {
      "originalFilename": "call-0042.txt",
      "agentId": "…", "teamId": "…", "productId": "…",
      "callDate": "2026-10-22",
      "language": "en-IN",
      "lines": [
        { "speaker": "agent", "text": "Good morning, this is Ravi.", "startMs": 0, "endMs": 2800 },
        { "speaker": "customer", "text": "Hi.", "startMs": 3000, "endMs": 3400 }
      ]
    }
  ]
}
```

- Give times on every line or on none. Without times, the call page and exports show line numbers instead (`timed: false` on the call).
- The language must be named; it cannot be detected without audio. Regional transcripts are translated before scoring.
- Calls answer `input: "transcript"` and have no recording. Scoring, findings, webhooks and batch exports work as for audio.

With the SDK, `latte.calls.uploadTranscript({ ...details, text })` and `latte.batches.createFromTranscripts([...])` accept labelled text (`Agent: …` / `Customer: …`, optional `[mm:ss]`) or lines, read with `parseTranscript`.

## Personal data

Transcripts, finding quotes, exports and webhook payloads mask card numbers
(Luhn checked), Indian mobile numbers, Aadhaar (Verhoeff checked), PAN, IFSC,
account-like digit runs and email addresses, for example `[card ••••1234]`.
Keys never receive the unmasked text. QA and managers signed in to the app may
reveal it on a call page; each reveal is audited (ADR-0023).

## Webhooks

A manager adds an HTTPS endpoint under Developers > Webhooks and picks events:

| Event | When |
| --- | --- |
| `call.scored` | a call has its score and findings |
| `call.failed` | a call gave up, with the reason |
| `batch.completed` | every call in a batch has finished, scored or failed |
| `alert.triggered` | an alert rule fired for a team, product or agent |
| `digest.ready` | a daily or weekly digest was built |

Each delivery is a POST with these headers:

- `Latte-Event`: the event type.
- `Latte-Delivery`: the delivery id; the same on a redelivery, so use it to drop duplicates.
- `Latte-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`, keyed with the endpoint's `whsec_` secret.

Answer 2xx within 10 seconds. Anything else is retried 8 times over about a
day (30 s, 2 min, 10 min, 30 min, 1 h, 3 h, 6 h, 12 h). After 50 failures in a
row the endpoint is disabled. Endpoints must be public HTTPS on port 443;
private, loopback and link-local addresses are refused at delivery time, and
redirects are not followed (ADR-0021).

Checking a signature with the SDK:

```ts
import { verifyWebhookSignature } from "@latte/sdk";

const ok = await verifyWebhookSignature({ secret, header: req.header("Latte-Signature"), body: rawBody });
```

Without the SDK: split the header on `,`, read `t` and `v1`, compute
`HMAC-SHA256(secret, t + "." + rawBody)` as hex, compare in constant time, and
refuse a `t` more than five minutes from now.

## Status

`GET /api/status` needs no key and reports the API, database, storage, job
queue and model providers, with any incident notices. The page is at `/status`.
