# ADR-0018: Scoped API keys, Postgres rate limits and per-key request logs

- Status: Accepted
- Date: 2026-10-16
- Task: SCC-1
- Deciders: engineering, with the product owner (chose manager-owned scoped keys and Postgres counters)
- Area: api, auth, data model
- Reversibility: moderate: migration 0008 has a down file; keys live in repo/api-keys.ts, api-access.ts and routes/api-keys.ts

## Context

Customers want to push calls from their CRM or dialler and pull results into their own systems. That needs machine credentials that do not share a person's session, can be limited and revoked, and leave a trail. They also need to see what a key did and why requests were refused.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Manager-created keys with scopes, acting as their creator (chosen) | a key's reach follows its creator's role; when the creator stops being a manager, the key stops working | one tenant, a few integrations |
| Any user creates personal keys with their own role | agents and QA keys widen the surface for little gain | self-serve developer platforms |
| OAuth client credentials | a token endpoint, rotation and clients to run: more than one tenant needs | many third-party apps |
| Rate limits in memory per process | limits multiply with processes and reset on deploy | a single process |

## Decision

- **Key format.** `latte_<prefix>_<secret>`: an 8-character prefix finds the row, and a 32-byte random secret is checked against its SHA-256 hash in constant time. A slow hash adds nothing at that entropy. The secret is shown once, at creation.
- **Who a key acts as.** A key acts as the manager who created it. `authenticate` refuses a revoked or expired key with 401, and a key whose creator is no longer a manager with 403.
- **Default deny.** `api-access.ts` lists every route a key may call, with the scope it needs and its rate-limit bucket. Anything unlisted answers 403 `not_for_api_keys`: reviews, rubrics, spend, the signed export links and key management. A missing scope answers 403 `insufficient_scope`.
- **Rate limits.** Requests are counted per key, bucket and fixed window with one upsert in `rate_limit_windows`, so the count holds across processes.

  | Bucket | Default limit |
  | --- | --- |
  | read | 600 per minute |
  | single | 60 per minute |
  | batch | 20 per minute |
  | bulk | 10 per hour |

  Every response carries `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` and `RateLimit-Policy`; a 429 also carries `Retry-After`. Managers can set each limit per key, within a ceiling.
- **Request log.** One `api_requests` row per keyed request records the route template (never the path, query or body), the bucket, the status, the duration and the request id. It is written after the response is sent, and a failure to write is logged, never thrown. The nightly purge keeps 30 days of requests and one day of windows.
- **Metrics.** Per key: requests per day by outcome, error rate, p50 and p95 latency (`percentile_cont`), use in the current window per bucket, and the busiest routes.
- **API description.** `GET /api/openapi.json` is built from the shared Zod schemas (`z.toJSONSchema`) and the same route list the gate enforces.

## Consequences

- **Cost per request.** Each keyed request makes one extra upsert, and one insert after the response.
- **Default deny on new routes.** A new route must be added to `API_KEY_ROUTES` before a key can call it; forgetting means a 403, never an open door.
- **Audit.** Key lifecycle actions are audited with `audit_events.api_key_id`, and batches created by a key record it (`batches.api_key_id`, source `api`).

## Commits us to

The `api_keys`, `api_requests` and `rate_limit_windows` tables, and the `latte_` key format, which clients may pattern-match.
