# Production readiness: where Latte stands

Updated: 2026-10-23. Owner: engineering.

This page checks an outside production-readiness review (23 October 2026) against the code on `main`. That review was written from the README and the design documents, so it treats the job system as pg-boss and lists some gaps that are already closed. Here each point is marked done, partial or missing, with the file that shows it, and every job-related fix is written against the queue port so it holds for any queue system.

## How jobs run today

Jobs go through one queue port (`apps/api/src/jobs/bus.ts`, ADR-0032). Each queue system is an adapter in `apps/api/src/jobs/adapters`, chosen by `JOB_QUEUE`:

| Adapter | Where it runs | Delivery |
| --- | --- | --- |
| Vercel Queues (`vercel.ts`) | Vercel, the default for every Vercel build | push: Vercel calls `apps/api/src/vercel-queues.ts` per message, capped per topic by `QUEUE_MAX_CONCURRENCY_<TOPIC>` |
| pg-boss (`pgboss.ts`) | local, Docker, tests, or Vercel with `JOB_QUEUE=pgboss` | pull: a worker subscribes, or a request drains |
| memory (`memory.ts`) | unit tests | pull |

Kafka, SQS or RabbitMQ would be one more adapter that passes `bus.contract.ts`. Nothing outside `src/jobs/adapters` imports a queue library, so the rules below are about the port and Postgres, never one queue.

## Already in place

- **Judge safety:**
  - The transcript is delimited as evidence and the judge has no tools (`apps/api/src/scoring/prompt.ts`).
  - The model must answer a strict JSON schema, checked with Zod (`packages/shared/src/judge.ts`, `scoring/score.ts`).
  - Cited segments must exist, and a breach can only cite the agent's lines.
  - Quotes and times are copied from the transcript by code.
- **Failing safe:**
  - A failed judge sets `judge_status='failed'`, and the database forces `needs_review` (`0001_initial.sql`).
  - The rule net runs on its own and can only add risk (`scoring/rules.ts`, `score.ts`).
- **Retries:**
  - Rate limits reschedule up to 12 times. Bad audio and an exhausted budget fail at once. Other errors retry up to `RETRY_LIMIT` (4), then the call is marked failed with its reason (`jobs/handlers.ts`).
  - A second delivery finds the call already claimed (`claimCall`, `repo/calls.ts`).
- **Webhooks:** HMAC over timestamp and body, 8 backoff steps over 12 hours, https on port 443 only, and private addresses refused at DNS lookup (`webhooks/sender.ts`, `repo/webhooks.ts`).
- **Auth:**
  - JWTs are checked for issuer, audience, algorithm, `exp` and `sub` (`auth.ts`).
  - API keys are stored as SHA-256 hashes, compared in constant time, with scopes.
  - SSO is invite-only.
  - Revealing masked personal data and issuing an audio link are both audited.
- **Logs:** ids and counts only, with authorization headers and cookies redacted (`logger.ts`).

## Gaps, and how to close them without tying them to one queue

| Gap | Evidence | Fix | Intent |
| --- | --- | --- | --- |
| A publish can be lost after the call's transaction commits | `routes/calls.ts`: the publish follows the commit. The 10-minute sweep (`jobs/sweep.ts`) covers Vercel only; pg-boss has no equivalent | Transactional outbox: a `job_outbox` row in the call's transaction. A dispatcher publishes it through the port with the row id as idempotency key and marks it sent. Adapters without dedupe rely on `claimCall` | B |
| Dead letters exist only on pg-boss | `adapters/pgboss.ts` has `-dead` queues; Vercel stops after 5 deliveries | Keep the dead-letter record in Postgres: a `stage_attempts` row per attempt (call, stage, attempt, error class, time) and an operator view. The queue's own DLQ becomes optional | B |
| No provenance | `PROMPT_VERSION` is defined in `scoring/prompt.ts` and never stored. Transcripts and scores are deleted and re-inserted on retry (`repo/calls.ts`, `repo/scores.ts`) | Store the prompt version, model route and transcript version on each score, and keep earlier scoring runs | B |
| Rate limits count per process and are set by hand | `packages/gateway/src/limiter.ts` | A token bucket shared through Postgres in the gateway, sized from the provider's rate-limit headers (Q-012). Queue caps stay the coarse control | C |
| The budget check can race | `gateway.ts`: a SUM, then the call | Atomic reservation: a conditional `UPDATE ... RETURNING` before dispatch, settled with the real cost after | C |
| No provider request id; 429s are not logged | the `model_calls` columns | Store the request id, log 429s, add a reconciliation report | C |
| Transcripts reach providers unredacted | no redaction step in `scoring/` or the gateway | `PII_REDACTION_TO_PROVIDERS`, on by default (Q-013, decided): placeholders per call before any provider request; rules that need the exact words run on the raw text in our code. An ADR records the design | D |
| Deleting a call only hides it | `repo/calls.ts` sets `deleted_at`; the purge ignores it | The purge removes audio and transcripts of deleted calls after `DELETED_CALL_GRACE_DAYS` (default 30) | D |
| No retention for transcripts, scores, findings, `model_calls`, `audit_events` | `docs/design/data-model.md`, Q-009 | A purge per table, driven by the retention settings below (Q-009, decided) | D |
| The upload type is the client's word | `audio/decode.ts` picks the decoder from the declared MIME type | Check magic bytes before decoding | D |
| Upload links use Supabase's default expiry and are not audited | `storage.ts` | `UPLOAD_URL_SECONDS` (default 900); audit issuance | D |
| No backup or restore runbook; no CI secret scan or SBOM | `docs/runbooks`, `.github/workflows/ci.yml` | A restore runbook tested once; a secret scan and SBOM in CI | D |
| The eval set is synthetic, with no recall threshold and no per-language metric | `evals/src` | A human-labelled holdout set, recall thresholds per rubric item and language, gate on regressions | E |
| Scoring reads translated English | `scoring/types.ts` reads `textEn ?? text` | Evaluate an original-language route and show both texts to reviewers | E |
| Passed calls are never sampled for QA | `score.ts` routes only flagged calls | `QA_SAMPLE_PERCENT` (default 5) of passed calls go to QA at random, to measure misses | E |
| No reviewer assignment, calibration or adjudication | `routes/review.ts` | Assignment and due dates, double scoring, adjudication | F |
| Rubric edits take effect at once | `repo/reference.ts` | Approval, effective dates, a back-test on recent calls before activation | F |
| No export of audit events or reviewer history | `audit_events` is written only | An audit export per call and per period | F |
| No cost per call by language or duration | `repo/billing.ts` aggregates only | Cost per call in the statement | F |
| One organisation with teams; managers and QA see every team | no organisations table; `scopeOf` in `auth.ts` | Multi-tenancy (decided 2026-10-23, Q-014): an organisations table, `org_id` on every customer row, every query and storage path scoped, cross-org negative tests | G |
| An invited person lands signed in but never sets a password, so after sign-out they cannot get back in by password | `auth-admin.ts` sends a Supabase invite; nothing in `apps/web/src/features/auth` asks for a password on arrival | A "Set your password" step on the first sign-in from an invite, which Settings > Security reuses (`changePassword` in `session.ts`) | H |
| No "Forgot password" on the sign-in page, and no screen for the reset link | `SignInPage.tsx` signs in with a password, Google or Microsoft, or SAML; there is no `resetPasswordForEmail` and no handling of the recovery event | "Forgot password?" sends Supabase's reset email; the link opens a "Choose a new password" screen | H |
| Google sign-in is built but off unless configured | `signInWithProvider` exists; the button shows only when `VITE_AUTH_PROVIDERS` includes `google` and the Google provider is enabled in Supabase | Default `VITE_AUTH_PROVIDERS` to `google`; the runbook names the Supabase and Google console steps (`docs/runbooks/sso.md`). Invite-only stays: a Google account whose email was never invited has no profile, and the API already refuses it with 403 (`authenticate` in `auth.ts`) | H |
| No ops metrics or traces | no `/metrics`, no OpenTelemetry | Metrics for queue age, attempts, provider errors and cost; traces across API, job and provider | C |

## Settings instead of fixed values

Owner's rule (2026-10-23):
- Every limit, period and switch is configuration, never a constant in code.
- Each default is the common SaaS choice.
- Environment variables set the platform default. Once multi-tenancy lands (Intent G), each organisation can override it in its own settings, as `teams.audio_retention_days` already overrides `AUDIO_RETENTION_DAYS`.
- Settings marked "exists" are in `apps/api/src/config.ts` today. The other names are proposals; each is added by the Intent shown, documented in `.env.example`, and validated at startup.

| Setting | Default | Why this default | Settles | Status |
| --- | --- | --- | --- | --- |
| `AUDIO_RETENTION_DAYS` | 90 | common QA default for recordings | Q-004 | exists, team override exists |
| `TRANSCRIPT_RETENTION_DAYS` (transcripts, scores, findings, reviews) | 365 | one year of coaching and trend history | Q-009 | D |
| `AUDIT_RETENTION_DAYS` | 365 | one year of access history, the usual audit expectation | Q-009 | D |
| `MODEL_CALL_RETENTION_DAYS` | 395 | 13 months, so a year of billing can be reconciled | Q-009 | D |
| `DELETED_CALL_GRACE_DAYS` (then audio and transcript are purged) | 30 | the usual soft-delete grace period | Q-009, erasure | D |
| `REMOVED_MEMBER_RETENTION_DAYS` (profiles and agents after removal) | 90 | lets history resolve names for a quarter | Q-009 | D |
| `PII_REDACTION_TO_PROVIDERS` | on | personal data stays out of third-party prompts unless a team turns it off; rules that need exact words run on the raw text in our code | Q-013 | D |
| `UPLOAD_URL_SECONDS` | 900 | 15 minutes covers a 50 MB upload on a slow link | upload gap | D |
| `SIGNED_URL_SECONDS` (audio playback) | 600 | short-lived links | | exists |
| `MAX_UPLOAD_FILES` per upload, `MAX_UPLOAD_MB` per file | 50, 50 | today's limits, the Supabase free-plan file cap | Q-001 | constants in `packages/shared/src/api.ts`; made settings in D |
| `LLM_BUDGET_USD` (per month) | 5 | a demo-safe cap; production sets its own | Q-003 | exists; per-organisation budget in C and G |
| `LIMIT_LLM_RPM`, `LIMIT_LLM_TPM`, `LIMIT_STT_RPM`, `LIMIT_STT_AUDIO_SECONDS_PER_HOUR`, `LIMIT_SARVAM_RPM` | the provider's published base limits | starting values; the gateway lowers them to the account's limits from response headers | Q-012 | exists; header-driven and shared across instances in C |
| `QUEUE_MAX_CONCURRENCY_TRANSCRIBE`, `QUEUE_MAX_CONCURRENCY_SCORE` | unset (no cap) | caps only when a provider limit needs them | Q-012 | exists |
| `QA_SAMPLE_PERCENT` (passed calls sent to QA at random) | 5 | QA teams commonly sample 2 to 5 percent | sampling gap | E |
| `RETRY_LIMIT`, `MAX_RESCHEDULES` | 4, 12 | today's values | | constants in `jobs/`; made settings in B |
| `API_REQUEST_RETENTION_DAYS`, `WEBHOOK_DELIVERY_RETENTION_DAYS` | 30, 30 | today's values | | constants in the purge; made settings in D |

**Provider limits follow the account (Q-012, decided).** The gateway reads each provider's rate-limit response headers where it sends them (Groq does) and lowers its limits to match. The `LIMIT_*` settings are the starting values and the fallback for providers that send none. Built in Intent C, together with the limiter shared across instances.

## Order of work

- **A. Truth in docs:** this page, the corrected design docs, and the questions below.
- **B. Durable pipeline:** outbox, attempt history, provenance. Its new tables carry `org_id` from the start, since G follows.
- **G. Multi-tenancy:** a `tech-decision` and an ADR on the isolation model, drafted alongside B.
- **C. Provider and cost safety.**
- **D. Data protection.**
- **E. AI quality.**
- **F. QA workflow and enterprise features.**
- **H. Account access:** set a password after an invite, "Forgot password", reset screen, Google sign-in on by default. Small and independent of B to G, so it can go first.

Each of B to G changes schema or contracts, so each starts with its own plan.

## Decisions

All decided by the owner on 2026-10-23 (`docs/product/questions.md`):
- **Settings, with the defaults in the table above:** Q-001, Q-003, Q-004, Q-009, Q-013.
- **Q-012:** provider limits are read from the account automatically.
- **Q-014:** multi-tenant, as Intent G.
- **Q-015:** no legal review. Latte is a demo and open-source project, and its legal pages say they are templates.
- **Q-016:** the audience is sales-led companies, telecom and similar call-heavy businesses. The PRD targets B1 to B4 stand as the demo's targets.
