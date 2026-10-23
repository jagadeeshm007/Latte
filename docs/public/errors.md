---
title: Errors and request ids
description: The error envelope, every error code, and how to use request ids.
section: Concepts
order: 12
---

# Errors and request ids

Every error is JSON in one shape:

```json
{ "error": { "code": "validation_error", "message": "...", "details": {}, "requestId": "..." } }
```

- `code` is stable; branch on it, not on `message`.
- `message` is for people and may change.
- `details` is there when there is more to say: the failing fields of a validation error, or the bucket of a 429.

## Codes

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `validation_error` | the body or query failed validation; `details` names the fields |
| 400 | `bad_request` | the request could not be read, for example malformed JSON |
| 400 | `invalid_range` | `from` is after `to` |
| 400 | `upload_missing` | a confirmed file was never uploaded to its signed URL |
| 401 | `unauthorized` | no key, or the key is unknown, revoked or expired |
| 403 | `insufficient_scope` | the key lacks the endpoint's scope |
| 403 | `not_for_api_keys` | the endpoint is only for people signed in to the app |
| 403 | `forbidden` | the key's manager may not do this, for example confirming a path issued to someone else |
| 404 | `not_found` | no such record, or one the key may not see (the two answer the same) |
| 409 | `conflict` | the record's state does not allow this now |
| 409 | `idempotency_in_progress` | a request with the same `Idempotency-Key` is still running |
| 410 | `audio_purged` | the recording was deleted under the team's retention; the transcript and findings remain |
| 413 | `bad_request` | the JSON body is over 256 KB |
| 422 | `idempotency_key_reused` | the same `Idempotency-Key` was sent with a different body |
| 429 | `rate_limited` | over the key's limit; wait `Retry-After` seconds |
| 500 | `internal` | a fault on Latte's side; safe to retry reads |
| 503 | `service_unavailable`, `no_rubric` | Latte cannot serve the request right now |

## Request ids

Every response has an `X-Request-Id` header, and every error repeats it as `requestId`. You may send your own (letters, digits, `-` and `_`, up to 64 characters) to trace a request through your systems. Quote it when asking for help; it finds the request in the key's request log.

## Retrying

- Retry 429 after `Retry-After`, and 500, 502, 503 and dropped connections with backoff.
- Retry writes only with an [Idempotency-Key](idempotency.md), so a retry cannot create a second batch.
- Do not retry other 4xx answers: the same request will fail the same way.
