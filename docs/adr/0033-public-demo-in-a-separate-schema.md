# ADR-0033: A public demo inside production, in a separate Postgres schema

- Status: Accepted
- Date: 2026-11-02
- Task: SCC-11 (Intent DemoMode)
- Deciders: the product owner, who chose the demo inside the production deployment over a separate demo deployment (recommended), and the schema with a second pool over per-query scoping
- Area: auth, data model, api, jobs, web
- Narrows: ADR-0024 (invite-only sign-in) by one public exception, the demo
- Reversibility: easy: `DEMO_MODE=false` and a redeploy turn it off; the `demo` schema can stay or be dropped

## Context

Visitors should be able to try Latte without an invitation: see scored calls, open one, and upload one transcript of their own. The product is single tenant: no table carries an owner, and roles are the only boundary. A demo login added to the production database would see real customers' calls unless every query learned a new scope.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| A separate demo deployment with its own Supabase project (recommended) | a second project and deployment to keep in step | no shared database at all |
| A `workspace_id` on every table, filtered in every query, with row-level security behind it | every table, 24 files of SQL and every job change; until RLS is forced, one missed filter leaks real calls to the public | real multi-tenancy later |
| Row-level security keyed on a session setting | policies on every table, forced on the owner role; a pooled connection can carry the setting into the next request | a database already on RLS |
| Schema `demo` and a second pool (chosen) | migrations run twice; one more connection per instance | isolation by construction on one deployment |

## Decision

- **Schema.** `migrate` builds every table a second time inside the `demo` schema, through a pool whose connections `SET search_path TO demo, extensions`. `public` is never on that path, so a table missing from `demo` fails the query instead of reading real data. `migrations/demo/` adds the demo's own tables: `visitors`, `device_uploads`, `daily_uploads`, `session_starts`.
- **Identity.** `POST /api/demo/sessions` creates a visitor: a random id, a manager profile in `demo.profiles` named "Demo visitor", and a 24-hour token `ldemo_<HS256 JWT>` signed with a key derived from `DEMO_SECRET`. The device is `HMAC(key, IP + user agent + platform, language, time zone, screen)`; only the hash is stored. Sessions are limited to 5 an hour per hashed IP.
- **Requests.** A demo token is checked before Supabase's and never reaches it. The request is then served by a second copy of the API router built on demo dependencies: the demo pool, storage keys under `demo/`, and jobs tagged `workspace: "demo"`. No route or repository function changed to reach demo tables.
- **Allowlist.** A demo visitor may read calls, the review queue, dashboards, rubrics, alerts, notifications, saved views and model usage, upload one transcript, ask for an audio link and mark notifications read. Anything else, including any route added later, is `403 demo_forbidden`. Review actions are QA-only, so a demo manager has none. Calls another visitor uploaded are hidden by the call scope.
- **Limits.** One upload per device for 7 days, `DEMO_DAILY_UPLOADS` (default 50) across visitors per UTC day, one transcript of at most 200 lines and 20,000 characters. The claim is a primary-key insert, so two uploads at once make one call, and a failed upload gives it back.
- **Jobs.** The envelope gains an optional `workspace`; the pipeline runs a demo job on the demo's dependencies, including a gateway whose ledger, and so month budget, is the demo's own. The sweep covers both schemas. Alerts, digests, status checks and webhooks never run on the demo.
- **Cleanup.** The daily purge deletes expired visitors with their calls, batches and profile, and old counters. The real purge skips the bucket's `demo/` folder.
- **Seed.** `make demo-seed` loads the 22 scripts in `evals/calls` as calls owned by a fixed demo profile and queues them for the real pipeline. It may run against production because it refuses any pool that can see `public`.
- **Flag.** `DEMO_MODE` (off by default) requires `DEMO_SECRET`. The web app reads `GET /api/demo`, so turning the demo on or off needs a redeploy, not a rebuild.

## Consequences

- Real and demo data share one database and its capacity: a flood of demo traffic is bounded by the session and upload limits, not by separate hardware.
- Every migration runs twice. A migration that names `public.` explicitly would break the demo copy; `demo-schema.test.ts` checks every real table and column exists in `demo`.
- The device hash keys on the IP that Vercel forwards; a visitor who changes network and browser gets another upload. The daily cap bounds what that costs.
- Dashboards in the demo are aggregates over every demo call, other visitors' uploads included; no other visitor's text is shown.
- Regional-language seeded scripts are translated by Sarvam; without `SARVAM_API_KEY` those calls fail in the demo as they would anywhere.

## Commits us to

Unqualified table names in migrations and queries; the demo allowlist kept in step with the routes.
