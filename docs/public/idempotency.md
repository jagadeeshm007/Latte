---
title: Idempotency
description: Make retries safe with the Idempotency-Key header.
section: Concepts
order: 13
---

# Idempotency

Send `Idempotency-Key: <your id>` on a create, so retrying after a timeout cannot do the work twice. Use an id that names the thing you are creating, such as your own call or export id, or a UUID you store with the request: letters, digits, `_`, `.`, `:` and `-`, up to 255 characters.

It is honoured on:

- `POST /api/uploads/confirm` and `POST /api/uploads/transcripts`
- `POST /api/batches/{id}/retry-failed`
- `POST /api/webhooks`

## Behaviour

- The same key and the same body within 24 hours replays the first response, status and body.
- The same key with a different body answers `422 idempotency_key_reused`.
- A retry while the first request is still running answers `409 idempotency_in_progress`; wait and retry.
- A 5xx answer is not remembered, so a retry can succeed.
- Keys are per API key: two keys may use the same value without colliding.

```bash
curl -X POST "$LATTE_URL/api/uploads/transcripts" \
  -H "Authorization: Bearer $LATTE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: crm-export-2026-10-22-part-3" \
  -d @transcripts.json
```

The stored response is written after the request finishes, so a crash in between can leave a key unrecorded. Upload confirmation keeps its own uniqueness check on the storage path as the hard guard: a path can become a call once.

With the TypeScript SDK, writes take `{ idempotencyKey }`, and `calls.upload` sets one from the file's storage path.
