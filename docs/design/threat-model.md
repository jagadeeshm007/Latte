# Threat model (STRIDE): Latte

Serves: US-00-003, US-02-003, US-01-003; HLD section 9. Date: 2026-10-14.

## Assets

Customer call audio, transcripts and quotes (personal data); agent performance data; the Supabase secret key, database password and Groq key; the model budget; the integrity of findings and reviews (a compliance record).

## Trust boundaries

1. Browser to API (bearer JWT over HTTPS).
2. Browser to Supabase Storage (signed URLs).
3. API and worker to Supabase Postgres, Storage and Auth (secret key, DB password).
4. Worker to Groq (API key; audio and transcripts leave the boundary).
5. Transcript content to the judge (untrusted speech enters a model prompt).

## Entry points

REST routes under /api; signed upload and playback URLs; uploaded audio files (decoded in the worker); transcript text inside the judge prompt; environment configuration.

## Threats

| # | STRIDE | Threat | Rating | Mitigation | Story |
| --- | --- | --- | --- | --- | --- |
| T1 | Spoofing | Forged or expired JWT | High | jose verification against the project JWKS, issuer and audience checks, expiry enforced | US-00-003 |
| T2 | Elevation | Agent calls QA or manager routes | High | role middleware on every route; tests per role | US-00-003 |
| T3 | Information disclosure | Agent reads another agent's call or recording (IDOR) | High | ownership in the SQL predicate, 404 on mismatch (tenet 4) | US-00-001, US-02-003 |
| T4 | Information disclosure | Publishable key reads tables through PostgREST | High | RLS enabled with no policies on every table | US-02-003 |
| T5 | Information disclosure | Signed playback URL forwarded | Medium | 10-minute expiry, audit row per issue | US-02-003 |
| T6 | Tampering | Upload of a non-audio or oversized file, or a decoder bomb | Medium | type and size checks before signing, 50 MB cap, decoder errors caught, duration cap of 2 hours | US-01-001 |
| T7 | Tampering | Prompt injection in speech changes findings | High | delimited untrusted block, strict schema, no tools, rule net floor, eval with injection line | US-01-003 |
| T8 | Repudiation | Reviewer denies a decision | Low | reviewer id and time on every decision; audit on completion | US-01-006 |
| T9 | Denial of service | Budget drained by repeated retries or uploads | Medium | monthly budget refusal; upload limit of 50 files per request and 500 per batch; per-user hourly limits on sign, confirm and retry; retry only by QA | US-02-001 |
| T10 | Information disclosure | Secrets leak to the browser or logs | High | only VITE_SUPABASE_URL and publishable key in the web build (tenet 7); pino redaction of authorization headers; no text in logs | all |
| T11 | Information disclosure | Customer audio retained by Groq | Medium | open: review Groq terms and DPDP (HLD section 17) | US-02-003 |
| T12 | Tampering | Confirm call for an object path the caller did not upload | Medium | confirm accepts only a path issued to that user in the sign step (path embeds the uploader id and a random id) | US-01-001 |
| T13 | Denial of service | Unbounded list queries | Low | pagination with a maximum page size on every list route | all |
| T14 | Spoofing | Stolen or leaked API key | High | secret shown once and stored as a SHA-256 hash; scopes per key; expiry; revoke takes effect on the next request; every keyed request logged with its request id (ADR-0018) | API keys |
| T15 | Elevation | API key reaches review, rubric, spend or key management | High | default-deny route list in api-access.ts; unlisted routes answer 403 not_for_api_keys; tests per scope (ADR-0018) | API keys |
| T16 | Denial of service | One key floods the API or the model budget | Medium | per-key, per-bucket limits counted in Postgres across processes; 429 with Retry-After; bulk exports limited per hour; the monthly budget still applies | API keys |
| T17 | Information disclosure | Batch export link forwarded or logged | Medium | HMAC-signed, 5-minute expiry, names the person and the batch, re-checks the role on use; token in the query string, which the request log strips; each use audited (ADR-0017) | Batches |
| T18 | Tampering | Formula injection through file names in CSV exports | Low | cells starting with = + - @ are prefixed with an apostrophe | Batches |
| T19 | Information disclosure | Webhook URL aimed at an internal address (SSRF), directly, through DNS rebinding or a redirect | High | HTTPS on 443 only; address checked after resolution by a guarded lookup on the connection itself; private, loopback, link-local, CGNAT and multicast ranges refused; no redirects; 10 s timeout (ADR-0021) | Webhooks |
| T20 | Information disclosure | Webhook signing secrets read from the database | Medium | AES-256-GCM under `DATA_ENCRYPTION_KEY`, which lives only in the environment; shown once at creation (ADR-0021) | Webhooks |
| T21 | Spoofing | A forged delivery sent to a customer's receiver | Medium | HMAC-SHA256 signature over timestamp and body; SDK check with a 5-minute tolerance and constant-time compare | Webhooks |
| T22 | Elevation | A stranger drives the cron endpoints to run jobs or drain the budget | Medium | bearer `CRON_SECRET` compared in constant time; unset secret refuses everything; tasks take no input (ADR-0020) | Deployment |
| T23 | Information disclosure | Personal data in transcripts reaches API keys, agents or exports | High | redaction on read for detail, quotes, CSV, ZIP and transcript downloads; reveal only for QA and managers in the app, audited as `pii_revealed` (ADR-0023) | PII |
| T24 | Spoofing | Someone signs in through SSO without being invited | Medium | invite-only: no profile means no role; disabled profiles refused on the next request; the last manager cannot be removed (ADR-0024) | SSO |
| T25 | Tampering | A retried create runs twice, or a reused idempotency key returns another caller's response | Low | keys scoped to the owner (user or key) and checked against a hash of the body; mismatches answer 422 (ADR-0022) | API |
| T26 | Denial of service | The public status endpoint used to load the database | Low | answered from a 30-second in-memory cache with `Cache-Control: public` (ADR-0026) | Status |

## Mapped to stories

Every High threat has a test in the API suite: T1 and T2 (auth middleware tests), T3 (agent cannot read another agent's call or audio URL), T4 (RLS check script against the hosted project), T7 (eval injection call), T19 (sender tests refuse private addresses and redirects), T23 (redaction and reveal tests in the governance suite), T10 (lint rule and a build check that greps the web bundle for secret names).
