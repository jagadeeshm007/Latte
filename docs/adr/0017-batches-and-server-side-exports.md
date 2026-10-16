# ADR-0017: Batches as a table, and batch exports streamed by the API

- Status: Accepted
- Date: 2026-10-16
- Task: SCC-1
- Deciders: engineering, with the product owner (chose the server-side ZIP)
- Area: api, web ui, data model
- Reversibility: moderate: migration 0007 has a down file; exports live in apps/api/src/export and routes/batches.ts

## Context

Every call already carried a `batch_id`, one per upload confirm, but nothing read it back. Uploads stopped at 10 files and nothing downloaded more than one call. Customers upload a day's or a week's calls at once, and want to follow and download them as one unit.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| A `batches` table, chunked confirms, server-side ZIP with `fflate` (chosen) | one more dependency (`fflate` 0.8.3, no dependencies of its own); the API does the zipping | batches of hundreds of calls; API clients get the same export |
| Browser builds the ZIP (`fflate` in the web app) | every recording passes through the page's memory; nothing for API clients | small batches only |
| No ZIP: results CSV plus one link per recording | hundreds of separate downloads | when exports are rare |

## Decision

- **Batches table.** A `batches` row has a name, its creator and its source (`web` or `api`), and can be archived. Migration 0007 backfills one row per existing `batch_id`. `audit_events` gains a nullable `batch_id` for actions on a whole batch.
- **Uploading a batch.** A batch holds up to 500 calls, uploaded in chunks of up to 50 files per sign and confirm request (the web app uses 10, three at a time). A confirm can name an existing batch its caller started. The batch row is locked (`FOR UPDATE`) while the confirm counts and adds, so two chunks at once cannot overfill it.
- **Queue priority.** Calls from bulk confirms are queued with a lower pg-boss priority than one-off uploads, so a large batch does not hold up a single call.
- **Exports.**
  - `results.csv` holds one row per call and one column per rubric item. Text a spreadsheet would run as a formula is prefixed with an apostrophe.
  - `export.zip` holds the results, the transcripts (TXT and JSON) and, optionally, the recordings. It is streamed with `fflate`: one entry at a time, waiting whenever the client is slow, with recordings stored without recompression.
  - A ZIP is capped at 200 calls; larger batches export the CSV.
- **Signed export links.** A browser cannot attach its bearer token to a download, so the API signs a five-minute link (HMAC-SHA256 over the batch, the person, the format and the expiry). The token travels in the query string, which the request log does not record. Opening the link re-checks that the person still exists and may export, and that the batch still exists.
- **Link secret.** `EXPORT_LINK_SECRET` signs the links. Without it, each process makes its own secret at start, which is fine for one process and must be set when several serve traffic.

## Consequences

- Every new call needs a batch row first, so the seed loader and the edge tests create one.
- A link stays valid for its five minutes even if it is shared; every use is audited as `batch_exported`.
- A ZIP holding up to 200 recordings of up to 50 MB each is a long download. It is bounded in memory, but it holds an API connection open while it runs.

## Commits us to

`fflate` 0.8.3 in apps/api; the `batches` table and `audit_events.batch_id`; `EXPORT_LINK_SECRET` in production when more than one API process runs.
