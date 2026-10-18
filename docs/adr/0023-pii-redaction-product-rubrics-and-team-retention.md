# ADR-0023: PII redaction by default, a rubric per product, retention per team

- Status: Accepted
- Date: 2026-10-18
- Task: SCC-1
- Deciders: engineering, with the product owner
- Area: data model, compliance, scoring
- Reversibility: moderate: migration 0011 has a down file; redaction is applied on read, so stored text is unchanged

## Context

Transcripts and exports carry card numbers, phone numbers and identity numbers verbatim. Different products need different rubrics, and regulated lines need different keeping times.

## Decision

- **Redaction on read.** `packages/shared/src/pii.ts` finds card numbers (Luhn), Indian mobile numbers, Aadhaar (Verhoeff), PAN, IFSC, account-like digit runs and email addresses. Call detail, finding quotes, CSV and ZIP exports and transcript downloads are masked, for example `[card ••••1234]`. Stored text is not changed, so detectors can improve without a migration and QA can still review.
- **Reveal.** `?reveal=pii` on call detail works only for QA and managers signed in to the app, never for an API key or an agent, and each reveal writes a `pii_revealed` audit row.
- **Rubric per product.** `rubrics.product_id` (null is the default) with one active rubric per product (partial unique index). Scoring uses `rubricFor(productId)`. Dashboards and the leaderboard keep the default rubric's columns.
- **Retention per team.** `teams.audio_retention_days` (null means `AUDIO_RETENTION_DAYS`). New calls take their team's value; changing it recomputes `retention_until` for that team's unpurged calls.

## Consequences

- Masking is pattern-based: it can miss a number read out as words, and can mask a long reference number that is not personal. The reveal exists for that.
- Per-product items do not appear as dashboard columns.

## Commits us to

The mask format, and redaction as the default for every reader outside QA and managers in the app.
