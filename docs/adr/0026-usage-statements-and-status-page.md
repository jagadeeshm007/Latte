# ADR-0026: Usage statements without payments, and a public status page

- Status: Accepted
- Date: 2026-10-18
- Task: SCC-1
- Deciders: engineering, with the product owner (chose statements, no payments)
- Area: billing, operations
- Reversibility: easy: migration 0013 has a down file

## Context

Spend is visible but not billed, and customers cannot tell an outage from their own bug.

## Decision

- **Prices.** One editable `billing_prices` row: currency and rate from USD, a price per call scored, per audio minute, and model cost passed through with a markup percentage.
- **Statements** are computed on request for a month from `calls`, `scores` and successful `model_calls` (failed model calls are not billed), with breakdowns by team, product and API key, printable and as CSV. Nothing is stored, so a price change shows on the next view; a sent statement should be kept as its PDF or CSV.
- **Status.** `GET /api/status` is public and cached for 30 s: API, database latency, storage, job queue (oldest waiting job, failures in the last hour) and model providers (error rate in the last hour). A check every 5 minutes writes `status_checks` for 90-day bars. Managers post notices that show on `/status` and as a banner in the app.

## Consequences

No invoices, payments or tax handling. The status page reports what the service can see of itself; it is not an outside probe.

## Commits us to

The public status response shape.
