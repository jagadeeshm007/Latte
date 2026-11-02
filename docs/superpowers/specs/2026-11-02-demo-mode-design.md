# Demo mode: design

- Task: SCC-11 (Intent DemoMode), Unit SCC-11-1
- Date: 2026-11-02
- Owner: Jagadeesh
- Status: agreed in conversation, section by section, 2026-11-02

## Intent

People who visit Latte can try the product without an invitation. An
"Experience the app" button signs them in to a demo with sample calls that
were uploaded and analysed already. They may upload one transcript of their
own and see it scored. They cannot change a password, see members, keys,
billing or any real customer data. A feature flag turns demo mode on and off;
production runs with it on.

What the owner said, and what was chosen with them:

| Decision | Chosen |
| --- | --- |
| Where the demo lives | Inside production, one deployment |
| How demo data is kept apart | A separate `demo` Postgres schema reached through a second pool |
| Who owns the one upload | Each visitor has their own throwaway identity, kept outside the main tables |
| Visitor identity | A random id; a hash of device signals and IP is only the upload limit key |
| Role | Manager, with admin pages blocked |
| Spend protection | One upload per device plus a global daily cap |
| Flag | `DEMO_MODE`, set in Vercel production by the engineer |

Accepted risk: real data and demo data share one database. The design keeps
them apart by construction (a demo connection cannot name a real table), and
the tests sweep every route to prove it. Recorded in ADR-0033.

## Acceptance criteria

1. With `DEMO_MODE=true`, the landing and sign-in pages show "Experience the
   app"; one click lands the visitor, signed in, on the manager dashboard
   with seeded, scored calls.
2. A demo request can never read or write a row in the `public` schema or an
   object outside `demo/` in the recordings bucket.
3. A demo visitor cannot change a password or profile and cannot open
   members, API keys, webhooks, billing, status notices, batches or exports;
   the API answers 403 and the UI hides them.
4. A demo visitor may upload one transcript; it is scored by the real
   pipeline and appears in their calls. A second upload from the same device
   is refused with an explanation, even after clearing storage.
5. At most `DEMO_DAILY_UPLOADS` (default 50) demo uploads are scored per UTC
   day; past that, uploads are refused with "try again tomorrow".
6. One visitor never sees another visitor's uploaded call.
7. With `DEMO_MODE` unset or false, nothing of the demo is reachable: no
   button, `/api/demo/*` answers 404, demo tokens are refused.
8. Expired visitors and their uploads are deleted daily; seeded calls stay.
9. `make check` passes; the engineer gets the exact commands to migrate,
   seed, set the Vercel variables and redeploy.

## 1. Identity and the demo token

- `GET /api/demo` (public) answers `{ enabled, uploadsLeftToday }`; with the
  flag off, `{ enabled: false }` only.
- `POST /api/demo/sessions` (public, flag on only). The body carries browser
  signals: user agent, platform, language, time zone, screen size. The API
  adds the caller's IP from `x-forwarded-for` (first hop, set by Vercel) and
  computes `fingerprint = HMAC-SHA256(key("fingerprint"), ip + signals)`.
  Only the hash is stored; raw IP and signals are never stored or logged.
- It creates `demo.visitors (id, fingerprint_hash, created_at, expires_at)`
  with `expires_at = now() + 24 h`, and a `demo.profiles` row with the same
  id, role `manager`, display name "Demo visitor", email
  `visitor-<id>@demo.invalid`.
- Session creation is limited per IP hash with the existing
  `rate_limit_windows` table (in `demo`): 5 an hour.
- It answers `{ token, expiresAt }`. The token is `ldemo_` followed by an
  HS256 JWT (`jose`) signed with `key("token")`, `sub` the visitor id,
  `aud` `latte-demo`, expiry 24 h.
- `key(label) = HMAC-SHA256(DEMO_SECRET, label)`: one secret, separate keys.
- `authenticate` sends an `ldemo_` bearer to the demo verifier, never to
  Supabase. It loads the profile from the demo pool and checks the visitor
  has not expired. The request then carries `req.demo = { visitorId }`.
- Web: `getAccessToken()` returns the demo token when one is in
  `sessionStorage`, else the Supabase token. A banner "Demo mode: sample
  data" with "Exit demo" clears it.

## 2. Schema and pool

- `migrate()` runs twice when asked: on the normal pool, and on a pool whose
  `search_path` is `demo, extensions`. Migrations name no schema, so the
  second run builds every table inside `demo`, with its own
  `demo.schema_migrations`. A demo-only folder, `migrations/demo/`, then adds
  `visitors`, `device_uploads` and `daily_uploads`.
- `public` is never on the demo search path. A table missing from `demo`
  makes a query fail; it cannot fall through to real data.
- `createPool` takes an optional `searchPath`, applied on each new
  connection. The demo pool runs with `max: 1`.
- `server.ts`, `serverless.ts` and `worker.ts` build a demo context only
  when `DEMO_MODE=true`.
- Request path: after `authenticate`, a request with `req.demo` is served by
  a second copy of the API router built on demo dependencies: demo pool,
  storage that prefixes every key with `demo/`, and an enqueue that tags
  each job `workspace: "demo"`. Routers take everything from their deps, so
  no route or repository function changes to reach demo tables.
- Jobs: the envelope gains an optional `workspace` (`"demo"`); still
  version 1, absent means the main schema. `runPipelineJob` picks the deps by
  workspace; demo job deps re-tag their own follow-up jobs.
- The model ledger (`model_calls`) of demo jobs lands in `demo`, so the demo
  has its own `LLM_BUDGET_USD` month budget, apart from real customers'.
- The push sweep (`republishWaiting`) and the pull drain both cover demo.

## 3. Restrictions and limits

- An allowlist decides what a demo request may do; anything else is
  `403 demo_forbidden` "Not available in the demo". New routes are blocked
  until someone adds them.
- Allowed reads: `/me`, calls (list, detail, transcript, audio URL), review
  queue and findings, rubrics, reference data, analytics and dashboards,
  coaching, inbox and notifications, saved views, alert rules (read), and
  model usage (the dashboard's spend card, from the demo's own ledger).
- Blocked: members, API keys, webhooks, billing, status notices,
  batches and exports, `PATCH /me`, rubric edits, alert rule edits, digest
  settings, audio upload (`/uploads/sign`, `/uploads/confirm`).
- Allowed writes: `POST /uploads/transcripts` with one transcript, asking
  for an audio link of a visible call, and marking their notifications read.
  Review actions are QA-only in the app (`requireRole("qa_reviewer")`), so a
  demo manager has none; the seeded calls are read-only for everyone.
- Calls uploaded by another visitor are hidden: in demo, the call scope adds
  "not uploaded by another visitor" to every call query that takes a scope,
  and the review queue. Dashboards are aggregates (counts and scores, no
  text), so they include every demo call.
- Upload limit, one transaction, in this order:
  1. `demo.device_uploads` has the fingerprint: `409 demo_upload_used`.
  2. `demo.daily_uploads` for today is at the cap: `429 demo_busy`.
  3. More than one transcript, 200 lines or 20,000 characters: `422`.
  4. Otherwise insert the device row, bump the counter, create the call.
- Off for demo: digests, alert evaluation, webhook delivery, status checks.

## 4. Seed data and cleanup

- `pnpm --filter @scc/api demo-seed` (`make demo-seed`): a fictional
  company (teams, products, agents), the default rubric, a seeded manager
  profile that owns the seeded calls, and the 22 scripts in `evals/calls/`
  loaded as transcript uploads and queued for scoring by the real pipeline.
  Call dates spread over the last 30 days.
- Where a rendered WAV for a script exists in `evals/audio/calls/`, it is
  uploaded under `demo/` and the call is an audio call instead.
- It runs in production too (unlike `seed` and `load-seed`), and refuses to
  start unless the connection's schemas are exactly `demo` and `extensions`.
- Running it again leaves existing seeded calls alone and adds missing ones.
- Daily cleanup (in the purge job): visitors past `expires_at` are deleted
  with their profile, calls and dependent rows and their objects;
  `device_uploads` older than 7 days and `daily_uploads` older than 30 days
  are deleted. Seeded calls are never purged and keep their audio (their
  retention is set far out).

## 5. Feature flag and rollout

- `DEMO_MODE` (boolean, default false). On requires `DEMO_SECRET` (32+
  characters). `DEMO_DAILY_UPLOADS` (default 50).
- The web app learns the flag from `GET /api/demo`, so turning it on is a
  variable and a redeploy, not a rebuild.
- ADR-0033 records the exception to invite-only sign-in (ADR-0024) and the
  schema isolation. `.env.example`, the Vercel runbook and
  `docs/environments.md` are updated.
- Rollout, run by the engineer: merge; migrate (builds `demo`); add
  `DEMO_SECRET` and `DEMO_MODE=true` in Vercel production; `make demo-seed`
  against production; redeploy; verify. Rollback: `DEMO_MODE=false` and
  redeploy.

## 6. Testing

Local Postgres, `MODEL_MODE=replay` or the fake gateway, test first.

- Isolation: every `public` table exists in `demo` with the same columns;
  the demo pool's schemas are `demo, extensions`; a marker call in `public`
  never appears in any GET a demo token can reach, with routes enumerated
  from the router; a demo job writes only to `demo`.
- Identity: no raw IP or user agent stored; bad, expired or wrong-audience
  tokens are 401; with the flag off, demo tokens are 401 and `/api/demo/*`
  is 404.
- Allowlist: blocked routes are 403; review actions are 403; every route
  declared in `src/routes` is swept with a demo token and none returns real
  data.
- Limits: second upload from the same fingerprint is 409 for a new visitor;
  the cap gives 429; oversized gives 422; two parallel uploads make one call.
- Cleanup: expired visitors and their calls go; seeded calls and live
  visitors stay.
- Web: button hidden when off or failing; banner, exit, hidden admin
  navigation; the used, busy and too-large messages.

## Out of scope

- Real multi-tenancy (a `workspace_id` everywhere).
- Audio uploads by visitors.
- Dropping the `demo` schema when demo mode is turned off.
