# Ideas: what Latte could add next

A proposal, not a plan: each idea names the gap it closes, what it builds on
in the code today, and a rough size (S: days, M: one to two weeks, L: more).
Nothing here is built. Ordered roughly by value for a team already using Latte.

## Close the loop with the customer's systems

| Idea | Gap it closes | Builds on | Size |
| --- | --- | --- | --- |
| **Webhooks** (`call.scored`, `batch.completed`, `call.failed`) with signed payloads, retries and a delivery log per endpoint | Integrations poll today; `batches.wait` in the SDK is a stopgap | pg-boss queues for delivery and retry; the per-key request log design for the delivery log | M |
| **Idempotency keys** on upload confirm and batch create | A client retrying a confirm after a timeout cannot tell whether it landed | the storage-path uniqueness already refuses a double confirm; store the first response per key | S |
| **Export to a warehouse** (scheduled CSV or Parquet to S3, BigQuery or Snowflake) | Analysts copy CSVs by hand | the batch `resultsTable` and the leaderboard query | M |
| **Publish the SDK** to npm, plus a Python client generated from `openapi.json` | The SDK is a private workspace package | ADR-0019; the OpenAPI document already exists | S |

## Make the scores more useful to managers and agents

| Idea | Gap it closes | Builds on | Size |
| --- | --- | --- | --- |
| **Alerts**: a team's flag rate or one item's fail rate jumps against its own last 4 weeks | Managers find problems only by opening the dashboard | the highlights query already compares a period with the one before | M |
| **Scheduled digests**: a weekly email per manager with their highlights | Same as above, for people who never open the app | highlights; a mail provider behind the gateway pattern | S |
| **Coaching assignments**: turn a finding into a task for the agent, with a due date and a check on the next calls | Coaching notes are read, not acted on | findings, coaching notes, the agent scorecard | M |
| **Agent disputes**: an agent challenges a finding, and QA decides | Agents cannot answer back; QA disagreements exist only from the QA side | `finding_reviews`; the review queue | M |
| **Calibration sessions**: several QA reviewers score the same call blind, with agreement measured | Reviewer drift is invisible | the agreement table already measures judge against QA | M |
| **Saved views** on Calls and Performance, shareable by link | Filters are in the URL but not named or shared | URL search state (`calls-search.ts`, `performance-search.ts`) | S |

## Trust, compliance and scale

| Idea | Gap it closes | Builds on | Size |
| --- | --- | --- | --- |
| **PII redaction** in transcripts and exports (card numbers, phone numbers, Aadhaar, PAN) | Exports carry personal data verbatim | segments and words are stored apart, so spans can be masked per word | M |
| **Retention per team or product** instead of one `AUDIO_RETENTION_DAYS` | Regulated lines need different keeping times | the purge job and `retention_until` per call | S |
| **Single sign-on** (SAML or OIDC through Supabase) and SCIM user sync | Users are created by hand | Supabase Auth supports both | M |
| **Organisations (multi-tenancy)**: an `org_id` on every table, row-level security per org, keys and budgets per org | Latte is single-tenant (data-model.md, section 10); selling to a second customer means a second deployment | RLS is already enabled on every table; ownership is already checked in SQL | L |
| **Usage-based billing** per org from `model_calls` and calls processed | Spend is visible but not billed | `model_calls` already records cost per call and purpose | M |
| **A status page and per-key uptime** | Customers cannot tell an outage from their own bug | health and readiness endpoints; the API request log | S |
| **Custom rubric per product** | One active rubric for every product | rubric versions; `scores.rubric_id` | M |

## Small wins

- Show which key or person uploaded a call on the call page (batch source is stored).
- A "Copy as curl" button on the request log, without the key, to reproduce a failing request.
- Key rotation: create a successor key and revoke the old one after a grace period.
- Spend per batch and per key on the usage dialog (`batches` and `api_keys` already link to the calls).
