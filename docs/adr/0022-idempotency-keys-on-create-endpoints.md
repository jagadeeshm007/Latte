# ADR-0022: Idempotency keys on create endpoints

- Status: Accepted
- Date: 2026-10-18
- Task: SCC-1
- Deciders: engineering
- Area: api
- Reversibility: easy: one middleware and one table (migration 0009)

## Context

A client whose create request times out cannot tell whether it landed. Retrying may make a second batch, key or webhook.

## Decision

- `Idempotency-Key` (1 to 255 of letters, digits, `. : _ -`) is honoured on `/uploads/confirm`, `/api-keys`, `/webhooks`, `/batches/:id/retry-failed`, `/saved-views` and `/alert-rules`.
- `idempotency_keys` is keyed by owner (user or API key) and key, with the method, route, a hash of the body, and the stored status and response. Kept 24 hours.
- Same key and body replays the stored response. A run still in progress answers `409 idempotency_in_progress`; the same key with another body answers `422 idempotency_key_reused`. Responses below 500 are stored and replayed; a 5xx frees the key so a retry runs again.
- The SDK sends a key on every write that has one and only retries writes that do; `calls.upload` derives its key from the storage path.

## Consequences

The stored response is written after the handler, not in its transaction. A crash between the two leaves the key unrecorded and a retry runs again. Upload confirm keeps its storage-path uniqueness as the hard guard against a double call.

## Commits us to

The header and the two error codes.
