# ADR-0019: A TypeScript SDK as a workspace package

- Status: Accepted
- Date: 2026-10-16
- Task: SCC-1
- Deciders: engineering
- Area: sdk
- Reversibility: cheap: packages/sdk depends on @scc/shared and nothing else

## Context

Machine clients need to upload batches (sign, upload, confirm, in chunks), handle rate limits and read results. Every customer writing that loop by hand repeats the same mistakes: retrying writes that may have landed, ignoring `Retry-After`, uploading 500 files in one request.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| A hand-written client in packages/sdk using the shared Zod schemas (chosen) | kept in step with the API by hand, though the shared schemas catch most drift | one API, one team |
| Generate a client from openapi.json | adds a generator dependency and still needs the batch upload loop by hand | many languages |
| Document the HTTP API only | every customer rebuilds chunking and retries | very simple APIs |

## Decision

`@latte/sdk` (`packages/sdk`) exposes `LatteClient` with `calls`, `batches` and `analytics`.
- **Retries.** It retries a 429 after `Retry-After` on any method, because the gate refuses before any work. It retries server errors and dropped connections only on GET, with backoff.
- **Validation.** Every response is checked against the API's own schemas. Errors carry the server's code and request id.
- **Batch upload.** `batches.create` uploads in chunks the way the web app does: the first chunk creates the batch, then a few run at once. `batches.wait` polls until no call is queued or running.

## Consequences

- The package is private and ships TypeScript source like the other workspace packages. Publishing to npm needs a build step to `dist`, a `files` list and `private: false`; that is not done yet.
- Node 18 or later is needed, for `fetch`, `AbortSignal.timeout` and `crypto.randomUUID`.

## Commits us to

Keeping the SDK in step with `API_KEY_ROUTES`; its tests run in `make check`.
