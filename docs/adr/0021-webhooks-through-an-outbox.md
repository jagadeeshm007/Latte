# ADR-0021: Webhooks through an outbox, signed, with an SSRF guard

- Status: Accepted
- Date: 2026-10-18
- Task: SCC-1
- Deciders: engineering
- Area: api, integrations, security
- Reversibility: moderate: migration 0009 has a down file

## Context

Integrations poll for results today. They need a push when a call is scored or fails, a batch completes, an alert fires or a digest is ready, without losing an event when a process dies and without Latte becoming a way to reach private networks.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Send from the handler after commit | an event is lost if the process dies between commit and send | best-effort notifications |
| One pg-boss job per delivery | a second store of truth for delivery state, and a cron-drained queue adds latency | a long-lived worker only |
| Outbox table polled by the sender (chosen) | polling every 15 s locally and every minute on Vercel | both deployments |

## Decision

- **Outbox.** `webhook_deliveries` rows are written in the same transaction as the change that causes them (`announceScored`, `failCall`, `completeBatchIfDone`, alerts, digests), one per subscribed endpoint.
- **Claiming.** `claimDue` takes due rows with `FOR UPDATE SKIP LOCKED`, so two senders never send the same row.
- **Signing.** `Latte-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "t.body">` with a per-endpoint `whsec_` secret, plus `Latte-Event` and `Latte-Delivery`. The SDK's `verifyWebhookSignature` checks it with a 5-minute tolerance.
- **Secrets at rest.** Signing needs the secret back, so it is encrypted with AES-256-GCM under `DATA_ENCRYPTION_KEY` (`crypto.ts`, format `v1.iv.tag.body`), not hashed. Without the key, webhooks cannot be created.
- **SSRF guard.** HTTPS on port 443 only; the host is resolved at delivery time through a guarded lookup that refuses private, loopback, link-local, CGNAT and metadata ranges (IPv4 and IPv6); redirects are not followed; 10 s timeout.
- **Retries.** 8 retries at 30 s, 2 min, 10 min, 30 min, 1 h, 3 h, 6 h, 12 h; an endpoint is disabled after 50 straight failures. Managers can redeliver from the log. Deliveries are kept 30 days.

## Consequences

- Delivery is at least once; receivers drop duplicates by `Latte-Delivery`.
- Losing `DATA_ENCRYPTION_KEY` means every endpoint needs a new secret.

## Commits us to

The header names, the signature format and the event names, which receivers code against.
