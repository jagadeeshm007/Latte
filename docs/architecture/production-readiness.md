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
| Rate limits count per process | `packages/gateway/src/limiter.ts` | A token bucket shared through Postgres in the gateway. Queue caps stay the coarse control | C |
| The budget check can race | `gateway.ts`: a SUM, then the call | Atomic reservation: a conditional `UPDATE ... RETURNING` before dispatch, settled with the real cost after | C |
| No provider request id; 429s are not logged | the `model_calls` columns | Store the request id, log 429s, add a reconciliation report | C |
| Transcripts reach providers unredacted | no redaction step in `scoring/` or the gateway | Owner decision first (Q-013), then an ADR. Placeholders per call, with exceptions where a rule needs the exact words | D |
| Deleting a call only hides it | `repo/calls.ts` sets `deleted_at`; the purge ignores it | The purge removes audio and transcripts of deleted calls after a grace period | D |
| No retention for transcripts, scores, findings, `model_calls`, `audit_events` | `docs/design/data-model.md`, Q-009 | Owner sets periods (Q-009), then purge jobs per table | D |
| The upload type is the client's word | `audio/decode.ts` picks the decoder from the declared MIME type | Check magic bytes before decoding | D |
| Upload links use Supabase's default expiry and are not audited | `storage.ts` | Explicit expiry; audit issuance | D |
| No backup or restore runbook; no CI secret scan or SBOM | `docs/runbooks`, `.github/workflows/ci.yml` | A restore runbook tested once; a secret scan and SBOM in CI | D |
| The eval set is synthetic, with no recall threshold and no per-language metric | `evals/src` | A human-labelled holdout set, recall thresholds per rubric item and language, gate on regressions | E |
| Scoring reads translated English | `scoring/types.ts` reads `textEn ?? text` | Evaluate an original-language route and show both texts to reviewers | E |
| Passed calls are never sampled for QA | `score.ts` routes only flagged calls | Configurable random sampling of passed calls, to measure misses | E |
| No reviewer assignment, calibration or adjudication | `routes/review.ts` | Assignment and due dates, double scoring, adjudication | F |
| Rubric edits take effect at once | `repo/reference.ts` | Approval, effective dates, a back-test on recent calls before activation | F |
| No export of audit events or reviewer history | `audit_events` is written only | An audit export per call and per period | F |
| No cost per call by language or duration | `repo/billing.ts` aggregates only | Cost per call in the statement | F |
| One organisation with teams; managers and QA see every team | no organisations table; `scopeOf` in `auth.ts` | Multi-tenancy (decided 2026-10-23, Q-014): an organisations table, `org_id` on every customer row, every query and storage path scoped, cross-org negative tests | G |
| No ops metrics or traces | no `/metrics`, no OpenTelemetry | Metrics for queue age, attempts, provider errors and cost; traces across API, job and provider | C |

## Order of work

- **A. Truth in docs:** this page, the corrected design docs, and the questions below.
- **B. Durable pipeline:** outbox, attempt history, provenance. Its new tables carry `org_id` from the start, since G follows.
- **G. Multi-tenancy:** a `tech-decision` and an ADR on the isolation model, drafted alongside B.
- **C. Provider and cost safety.**
- **D. Data protection.**
- **E. AI quality.**
- **F. QA workflow and enterprise features.**

Each of B to G changes schema or contracts, so each starts with its own plan.

## Decisions the code cannot make

These are open in `docs/product/questions.md`:
- Q-009: retention periods per data type.
- Q-012: the provider plan and throughput for the target volume. The HLD estimates about 50 scored calls a day on base Groq limits.
- Q-013: whether transcripts may reach providers unredacted.
- Q-015: legal review of the legal pages.
- Q-016: the PRD's business targets B1 to B4.

Q-014 (tenancy) is decided: multi-tenant, as Intent G.
