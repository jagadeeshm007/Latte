# ADR-0025: In-app notifications, saved views, flag-rate alerts and digests

- Status: Accepted
- Date: 2026-10-18
- Task: SCC-1
- Deciders: engineering, with the product owner (chose in-app only for now)
- Area: product, jobs
- Reversibility: easy: migration 0010 has a down file; email can be added as another channel

## Context

Managers find problems only by opening the dashboard. They asked for alerts when a team's flag rate jumps and for scheduled digests, and for named, shareable filters.

## Decision

- **Channels.** The in-app inbox (a bell with an unread count and a Notifications page) and webhooks (`alert.triggered`, `digest.ready`). No email for now, so no mail provider or address handling.
- **Saved views.** A name, a page (calls, performance, batches), the filters as JSON and a shared flag. Each page parses a view with its own search schema on apply, so a stale value drops only itself.
- **Alerts.** Rules on flag rate, average score or one item's fail rate, per team, product or agent: fire when the recent window moves past the baseline by the threshold, with a minimum number of calls and a cooldown. Evaluated hourly; each firing writes `alert_firings`, notifications for managers and the webhook in one transaction.
- **Digests.** Daily or weekly per user, built from the dashboard highlights; the hourly job sends those that are due.

## Consequences

People who never open the app do not see alerts unless a webhook forwards them (to Slack, for example).

## Commits us to

The notification kinds and the alert rule fields.
