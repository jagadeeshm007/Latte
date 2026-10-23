# Open questions: Latte (sales call compliance and coaching)

PRD: docs/product/PRD.md   Updated: 2026-10-23
Entries: 16   Open: 15   Needs your confirmation: 9

Basis, for every entry:
- stated: the input answers it elsewhere; the passage that wins is named.
- inferred: only one reading is consistent with the rest of the input.
- convention: the input is silent and the team's standards settle it.
- assumption: nothing settles it; a choice was made so the team is not blocked.

## Needs your confirmation

- Q-001 How many files is a "small batch"? Assumed: 1 to 10 files per upload, 50 MB each (Supabase per-file cap). (US-01-001)
- Q-002 Who may upload recordings? Assumed: QA reviewers and managers; agents cannot upload. (US-01-001, US-00-003)
- Q-003 What is the default budget? Assumed: USD 5, set by `LLM_BUDGET_USD`. (US-02-001)
- Q-004 How long are recordings kept? Assumed: 90 days, then the audio is purged and the transcript and findings stay. (US-02-003)
- Q-006 Who edits the rubric? Assumed: managers only; each edit creates a new rubric version and old scores keep theirs. (US-01-004)
- Q-012 Which provider plan and throughput carry the target volume? Not assumed: the owner is moving from Groq's free tier to production limits; read them from the account. (HLD capacity, docs/architecture/production-readiness.md)
- Q-013 May transcripts reach model providers unredacted? Not assumed: today they do. (REQ-035)
- Q-015 Who reviews the legal pages before Latte relies on them? Not assumed: they are templates. (docs/public/legal)
- Q-016 Are the PRD's business targets B1 to B4 confirmed? Not assumed: all four are marked unconfirmed in the PRD. (PRD)

## Register

| Q | Status | Kind | Where | Basis | Question | Readings | Decision | Why | Affects |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Q-001 | open | open-question | REQ-003 | assumption | How many files is a small batch? | (a) up to 10; (b) up to 50; (c) unlimited | (a) 1 to 10 files, 50 MB each | the Supabase Storage per-file cap on the free plan is 50 MB; files go straight from the browser to Storage | US-01-001 |
| Q-002 | open | gap | REQ-002 | assumption | Which roles may upload? | (a) QA and manager; (b) everyone; (c) manager only | (a) | agents uploading their own calls weakens audit independence | US-01-001, US-00-003 |
| Q-003 | open | gap | REQ-026 | assumption | Default budget value | (a) USD 5; (b) other | (a), configurable | the spec leaves "XYZ" | US-02-001 |
| Q-004 | open | gap | REQ-035 | assumption | What does "private" require: storage, access, retention? | (a) private bucket, signed short URLs, access audit, 90-day audio retention; (b) also encrypt at application level | (a) | Supabase encrypts at rest; the brief names no regulation | US-02-003 |
| Q-006 | open | gap | REQ-010 | assumption | Who configures the rubric, and do old scores change? | (a) managers, versioned; (b) QA, in place | (a) | scores must stay comparable with the rubric they were judged by | US-01-004 |
| Q-005 | open | gap | REQ-036 | convention | Which guardrails? | (a) prompt-injection defence on transcripts, strict output schema, quote grounding, rule-based prohibited-phrase net; (b) plus a separate guard model call | (a) | the spec allows one model call per call for scoring | US-01-003 |
| Q-007 | open | contradiction | REQ-008, REQ-032 | stated | Seed audio is English-only (Orpheus) but the product must handle Hindi | (a) write Hindi lines romanised and voice them in English; (b) text-only seeds for Hindi | (a), and Hindi transcription quality is listed as unproven by the seed set | session answer chose Orpheus | US-01-002, US-02-002 |
| Q-008 | open | gap | REQ-018, REQ-019 | convention | How are judge misses counted when the judge reports nothing? | (a) reviewer can add a missed finding, counted as a judge false negative; (b) only agree/disagree | (a) | agreement on present findings alone hides false negatives, the metric that matters | US-01-006, US-01-007 |
| Q-009 | open | gap | Data model section 8 | convention | How long are transcripts, findings, reviews, audit events and agent records kept, and how is a customer's erasure request met? | (a) same 90 days as audio; (b) a regulatory period such as 7 years; (c) decided per table | none: kept until decided; no purge job for them | data-model rule: an unstated lifetime is UNDEFINED, not a default | US-02-003 |
| Q-010 | open | gap | REQ-023 | convention | Does provider configurability (OpenRouter, Gemini, Groq) cover speech-to-text? | (a) chat only; STT stays on providers returning segment timestamps (Groq, OpenAI); (b) all kinds | (a) | OpenRouter and Gemini expose no transcription endpoint with segment timestamps (HLD review) | US-02-001, US-01-002 |
| Q-011 | open | gap | REQ-017 | convention | Do agents' scorecards count findings QA rejected or has not reviewed? | (a) exclude findings QA disagreed with; include unreviewed; (b) only reviewed findings | (a) | coaching must not cite findings humans rejected; most calls may never be reviewed | US-00-001, US-00-002 |
| Q-012 | open | gap | HLD capacity | assumption | Which provider plan and throughput carry 20,000 calls a month and the two-hour burst? | (a) a paid Groq tier; (b) another provider; (c) pilot volume only | none: the owner is moving to production limits (2026-10-23); read the account's limits and record them | the HLD estimates about 50 scored calls a day on base Groq limits | US-01-002, US-01-003 |
| Q-013 | open | gap | REQ-035 | assumption | May transcripts reach model providers unredacted? | (a) yes, under the provider's data terms; (b) redact personal data with placeholders before any provider call, keeping exact words where a rule needs them | none: today they are sent unredacted | masking applies when data is read, not on the way to providers (production-readiness.md) | US-01-002, US-01-003, US-02-003 |
| Q-014 | decided | gap | REQ-002 | stated | One organisation with teams, or separate customer organisations? | (a) single organisation; (b) multi-tenant | (b), as Intent G (owner, 2026-10-23) | a second customer must never see the first's calls; today managers and QA see every team | US-00-003 and every data story |
| Q-015 | open | gap | docs/public/legal | assumption | Who reviews the legal pages before Latte relies on them? | (a) a lawyer before the first paying customer; (b) later | none | the pages are templates under Indian law | US-02-003 |
| Q-016 | open | gap | PRD B1 to B4 | assumption | Are the business targets confirmed? | (a) as written; (b) revised by the owner | none | every target is marked unconfirmed, so no claim may rest on them | all |
