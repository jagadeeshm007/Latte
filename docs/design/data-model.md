# Data model: Latte

**Store:** PostgreSQL · **Tables:** 12 · **Columns:** 112 · **Indexes:** 34 · **Personal-data columns:** 7

Author: draft, unreviewed   Date: 2026-10-14   Version: v1 (new)
Serves: US-00-001, US-00-002, US-00-003, US-01-001 to US-01-008, US-02-001, US-02-002, US-02-003; ADR-0003, ADR-0004
Generated views: schema.sql, data-dictionary.csv and erd.md are written by `docs/design/tools/gen_model.py` from one definition; edit that file, then rerun it.

## 1. Why these stores

### PostgreSQL

**Holds:** every entity: calls, transcripts, scores, findings, reviews, rubric versions, the model cost log, audit events. When pg-boss is the queue (local, Docker, tests; ADR-0032), it keeps its tables in its own schema in the same database; on Vercel the queue is Vercel Queues and holds no tables here. Recordings are objects in Supabase Storage, not rows.

| Considered | Why not |
| --- | --- |
| A document store for transcripts | findings join segments by (call_id, seq) and agreement queries join findings to reviews; relational joins are the main workload |
| A separate analytics store | 10^5 calls a year is small; dashboard SQL runs on the primary (HLD section 11) |

## 2. Entities: ownership and lifecycle

| Entity | Owner | Created by | Changed by | Ended by | Serves | PII | Retention |
| --- | --- | --- | --- | --- | --- | --- | --- |
| teams | API (reference data) | seed script | none | never | US-01-001, US-01-008 | no | kept |
| products | API (reference data) | seed script | none | never | US-01-001, US-01-008 | no | kept |
| agents | API (reference data) | seed script | none | never | US-01-001, US-00-001 | yes | UNDEFINED |
| profiles | API | seed script after the Auth user exists | seed script | never | US-00-003 | yes | UNDEFINED |
| rubrics | API | seed (version 1), manager save (US-01-004) | activation flag only | never | US-01-003, US-01-004 | no | kept |
| calls | API | upload confirm (US-01-001) | worker status moves, purge job | never; audio purged | US-01-001, US-01-002 | yes | row UNDEFINED; audio 90 days (Q-004, assumption) |
| transcript_segments | worker | transcribe job | replaced as a set on retry | with the call | US-01-002 | yes | UNDEFINED |
| scores | worker | score job | review completion (API) | replaced on retry of a failed judge | US-01-003, US-01-005 | no | UNDEFINED |
| findings | worker, API | score job (llm, rule), reviewer (US-01-006) | none | with the score | US-01-003, US-01-006 | yes | UNDEFINED |
| finding_reviews | API | reviewer decision | reviewer changes it in place | with the finding | US-01-006 | yes | UNDEFINED |
| model_calls | gateway | every model call | none | never | US-02-001 | no | kept; it is the budget ledger |
| audit_events | API, worker | audio URL issue, upload, rubric save, review, purge | none | never | US-02-003 | no | UNDEFINED |

Every writer, every column: upload confirm supplies agent, team, product, date, batch, uploader, filename, type, size, path and retention (today plus the configured days); the worker supplies duration, status and error; the score job supplies every scores column except reviewed_by and reviewed_at, which only review completion writes.

Not modelled: upload batches as a table (a batch id on calls is enough for AC-US-01-001-2); users (Supabase Auth owns them).

## 3. Relationships

See erd.md for the diagram and one sentence per relationship. Rules: reference data uses RESTRICT so a team, product or agent with calls cannot vanish; call children (segments, scores, findings) CASCADE so a call removed by an operator takes its derived rows; the cost log and audit log use SET NULL so spend and access history survive.

Derived rows follow their parent: a retry of the transcribe job deletes and rewrites the call's segments in one transaction; a retry of a failed judge replaces the score and its findings in one transaction, and is refused once review_status is done.

## 4. PostgreSQL tables

### `teams`: Teams (hot: no)

Sales teams calls are grouped by, for upload metadata and the manager dashboard. Serves US-01-001, US-01-008. Volume: 10^1 to 10^2 rows; one per sales team.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Identifier of the team | every row needs a stable id that does not leak counts |
| name | text | no | UQ |  | Team name as managers know it | AC-US-01-001-1 records the team; AC-US-01-008-1 groups by it |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |

**Indexes**

- `uq_teams_name` on (name): lookup and de-duplication of team names on upload.

**Constraints**

- `chk_teams_name_not_blank` refuses a team named with spaces only.

### `products`: Products (hot: no)

Products a call is about, for upload metadata and the dashboard. Serves US-01-001, US-01-008. Volume: 10^1 rows; one per insurance product.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Identifier of the product | every row needs a stable id that does not leak counts |
| name | text | no | UQ |  | Product name | AC-US-01-001-1 records the product; AC-US-01-008-1 groups by it |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |

**Indexes**

- `uq_products_name` on (name): lookup by name on upload.

**Constraints**

- `chk_products_name_not_blank` refuses a product named with spaces only.

### `agents`: Sales agents (hot: no)

Sales agents whose calls are scored; separate from login profiles because agents can be scored before they have an account. Serves US-01-001, US-00-001, US-00-002. Volume: 10^2 to 10^3 rows; one per sales agent.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Identifier of the agent | every row needs a stable id that does not leak counts |
| team_id | uuid | no | FK |  | Team the agent belongs to | AC-US-01-008-1 groups by team; a team with agents cannot be deleted |
| name | text | no |  |  | Agent display name | AC-US-01-001-1 records the agent on each call |
| external_code | text | yes | UQ |  | Agent code from the distributor's HR system | uploads name agents by code to avoid duplicate names |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |

**Indexes**

- `idx_agents_team_id` on (team_id): list agents of a team; FK index.
- `uq_agents_external_code` on (external_code): match an uploaded agent code to one agent.

**Constraints**

- `chk_agents_name_not_blank` refuses an agent with an empty name.

### `profiles`: User profiles (hot: no)

The role and agent link of each Supabase Auth user; the API reads it on every request. Serves US-00-003, US-00-001. Volume: 10^2 to 10^3 rows; one per signed-in user.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK |  | The Supabase Auth user id (JWT sub) | AC-US-00-003-1 maps a signed-in user to a role; the id is issued by Auth, not generated here |
| email | text | no | UQ |  | Sign-in email, copied from Auth for display | reviewers are named on decisions (AC-US-01-006-2) |
| display_name | text | no |  |  | Name shown in the UI | the review record shows who decided (AC-US-01-006-2) |
| role | user_role | no |  |  | The user's single role | REQ-001: one role per user decides every permission |
| agent_id | uuid | yes | FK |  | Agent record of a user whose role is agent | AC-US-00-001-2: an agent reads only calls of their own agent record |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |
| updated_at | timestamptz | no |  | now() | When the row last changed | audit of edits; set by the application on every update |

**Indexes**

- `uq_profiles_email` on (lower(email)): one profile per email, case-insensitive.
- `uq_profiles_agent_id` on (agent_id) WHERE agent_id IS NOT NULL: one login per agent record; FK index.

**Constraints**

- `chk_profiles_agent_link` refuses an agent profile with no agent record, or a manager linked to one.

### `rubrics`: Rubric versions (hot: no)

Versioned rubrics; exactly one active version scores new calls, and old scores keep the version they used (Q-006). Serves US-01-003, US-01-004. Volume: 10^1 to 10^2 rows; one per rubric edit.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Identifier of the rubric version | every row needs a stable id that does not leak counts |
| version | integer | no | UQ |  | Monotonic version number | AC-US-01-004-2: scores show the version they were judged by |
| name | text | no |  |  | Human name of the rubric | managers tell versions apart in the rubric screen (US-01-004) |
| items | jsonb | no |  |  | Rubric items: key, type, label, description, examples | AC-US-01-004-1: a manager edits items; the scorer reads them (US-01-003) |
| is_active | boolean | no |  | false | Whether this version scores new calls | AC-US-01-004-1: the saved version becomes active |
| created_by | uuid | yes | FK |  | Manager who saved the version; null for the seeded default | audit of who changed the compliance rubric |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |

**Indexes**

- `uq_rubrics_version` on (version): fetch a version by number.
- `uq_rubrics_active` on (is_active) WHERE is_active: at most one active rubric; the scorer reads it.
- `idx_rubrics_created_by` on (created_by): FK index.

**Constraints**

- `chk_rubrics_items_array` refuses a rubric with no items.

### `calls`: Calls (hot: yes)

One uploaded recording and its pipeline state. Serves US-01-001, US-01-002, US-01-005, US-00-001, US-01-008, US-02-003. Volume: 10^5 a year at 20,000 calls a month; driven by upload volume.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Identifier of the call | every row needs a stable id that does not leak counts |
| agent_id | uuid | no | FK |  | Agent on the left channel | AC-US-01-001-1 records the agent; tenet 4 filters agent reads by it |
| team_id | uuid | no | FK |  | Team at the time of the call | AC-US-01-001-1 records team per call; agents can move teams later |
| product_id | uuid | no | FK |  | Product discussed | AC-US-01-001-1 records the product; AC-US-01-008-1 groups by it |
| call_date | date | no |  |  | Date the call took place | AC-US-01-001-1 records the date; AC-US-01-008-2 filters by range |
| batch_id | uuid | no |  |  | Upload batch shared by files uploaded together | AC-US-01-001-2: one batch id per multi-file upload |
| uploaded_by | uuid | no | FK |  | QA reviewer or manager who uploaded | audit of who put the recording in (Q-002) |
| original_filename | text | no |  |  | File name as uploaded | reviewers recognise calls by their source file; file names often carry customer names |
| mime_type | text | no |  |  | audio/wav or audio/mpeg | AC-US-01-001-3 refuses other types; the decoder is chosen by it |
| size_bytes | bigint | no |  |  | File size | AC-US-01-001-3 refuses files over 50 MB, the Supabase per-file cap |
| storage_path | text | yes |  |  | Object path in the private recordings bucket; null once purged | AC-US-02-003-2 signs a URL for it; AC-US-02-003-4 clears it on purge |
| duration_ms | integer | yes |  |  | Recording length, known after decoding | talk ratio and scaling numbers need call length (REQ-014) |
| status | call_status | no |  | 'uploaded' | Pipeline state | AC-US-01-002-1 and AC-US-01-002-2 move it; the call list shows it |
| error | text | yes |  |  | Reason the call failed, safe to show users | AC-US-01-001-4 and AC-US-01-002-5 show why a call failed |
| retention_until | date | no |  |  | Date after which the audio is purged | AC-US-02-003-4: the purge job deletes audio past this date (Q-004) |
| audio_purged_at | timestamptz | yes |  |  | When the audio was deleted | AC-US-02-003-4: transcript stays, the UI shows audio is gone |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |
| updated_at | timestamptz | no |  | now() | When the row last changed | audit of edits; set by the application on every update |

**Indexes**

- `idx_calls_agent_id_created_at` on (agent_id, created_at DESC): agent scorecard and own call list (US-00-001); FK index.
- `idx_calls_team_id_call_date` on (team_id, call_date): dashboard by team and date range (US-01-008); FK index.
- `idx_calls_product_id_call_date` on (product_id, call_date): dashboard by product and date range (US-01-008); FK index.
- `idx_calls_status_created_at` on (status, created_at DESC): call list filtered by status.
- `idx_calls_batch_id` on (batch_id): show an upload batch.
- `uq_calls_storage_path` on (storage_path) WHERE storage_path IS NOT NULL: one call per uploaded object, so a repeated confirm cannot spend the budget twice (migration 0002).
- `idx_calls_uploaded_by` on (uploaded_by): FK index.
- `idx_calls_retention_until` on (retention_until) WHERE audio_purged_at IS NULL: purge job finds calls due; the query must repeat WHERE audio_purged_at IS NULL.

**Constraints**

- `chk_calls_mime_type` refuses a file that is not WAV or MP3 (AC-US-01-001-3).
- `chk_calls_size_bytes` refuses an empty file or one over 50 MB (Q-001).
- `chk_calls_failed_has_error` refuses a failed call with no reason, or an error left on a healthy call.
- `chk_calls_purged_has_no_path` refuses a purged call still pointing at audio.

### `transcript_segments`: Transcript segments (hot: yes)

Timestamped text per channel; the source of every finding's quote and time (tenet 2). Serves US-01-002, US-01-003, US-01-006. Volume: 10^6 to 10^7 a year: about 100 per call.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | bigint | no | PK | generated always as identity | Row id | high-volume child rows; a bigint keeps the index small |
| call_id | uuid | no | FK |  | Call the segment belongs to | AC-US-01-002-2 saves segments per call |
| seq | integer | no |  |  | Order of the segment in the call, both channels merged by start time | the judge cites segments by number (US-01-003); findings point at it |
| channel | speaker_channel | no |  |  | Agent or customer | AC-US-01-001-5 labels left as agent and right as customer |
| start_ms | integer | no |  |  | Start in call time, milliseconds | AC-US-01-002-3: times match the recording; AC-US-01-006-1 seeks to it |
| end_ms | integer | no |  |  | End in call time, milliseconds | talk ratio sums segment durations (AC-US-01-003-4) |
| text | text | no |  |  | Transcribed words | the judge reads it and quotes are matched against it (AC-US-01-003-6) |
| language | text | yes |  |  | Language Whisper detected for the chunk | AC-US-01-002-4 saves the detected language |
| avg_logprob | real | yes |  |  | Whisper confidence for the segment | low-confidence text is shown dimmed so reviewers distrust it |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |

**Indexes**

- `uq_transcript_segments_call_id_seq` on (call_id, seq): load a call's transcript in order; FK index; grounding by seq.

**Constraints**

- `chk_transcript_segments_times` refuses a segment ending before it starts.

### `model_calls`: Model calls (hot: yes)

One row per gateway call: the cost log and the budget total. Serves US-02-001, US-01-003. Volume: 10^5 a year: about 3 per call (transcription chunks, one judge call).

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Identifier of the model call | every row needs a stable id that does not leak counts |
| provider | text | no |  |  | groq, openrouter or gemini | AC-US-02-001-2: provider is configuration; cost depends on it |
| model | text | no |  |  | Model id sent to the provider | AC-US-02-001-4 records the model |
| kind | model_kind | no |  |  | chat, stt or tts | cost is computed differently per kind (AC-US-02-001-4) |
| purpose | text | no |  |  | What the call was for: score, transcribe, seed_tts, eval | spend is reported by purpose on the usage page |
| call_id | uuid | yes | FK |  | Call the model call served, if any | AC-US-01-003-1 counts chat calls per call |
| status | model_call_status | no |  |  | ok, error or refused | AC-US-02-001-5 records refusals; failed calls still cost |
| input_tokens | integer | no |  | 0 | Prompt tokens billed | AC-US-02-001-4 logs tokens |
| cached_tokens | integer | no |  | 0 | Prompt tokens served from cache at half price | cost is exact only with cached tokens priced apart |
| output_tokens | integer | no |  | 0 | Completion tokens, reasoning included | AC-US-02-001-4 logs tokens; the 1000 cap applies to them |
| audio_seconds | numeric(10,2) | no |  | 0 | Billed audio seconds for transcription | Whisper is billed per audio hour with a 10 s minimum |
| characters | integer | no |  | 0 | Characters voiced for TTS | Orpheus is billed per character |
| cost_usd | numeric(12,6) | no |  | 0 | Cost of this call in US dollars | AC-US-02-001-5: the budget is the sum of this column |
| latency_ms | integer | no |  | 0 | Wall time of the request | operators see slow provider periods on the usage page |
| error | text | yes |  |  | Provider or gateway error summary, no content | explains failed and refused rows |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |

**Indexes**

- `idx_model_calls_call_id` on (call_id): FK index; calls per call.
- `idx_model_calls_created_at` on (created_at): usage per day on the manager page.

**Constraints**

- `chk_model_calls_nonnegative` refuses a negative usage or cost that would shrink the budget total.
- `chk_model_calls_output_cap` refuses a completion longer than the 1000-token cap (REQ-024).

### `scores`: Scores (hot: yes)

The current judgement of a call: talk ratio, coaching notes and QA routing. A rescore replaces it while review is not done. Serves US-01-003, US-01-005, US-01-006, US-00-001, US-00-002. Volume: 10^5 a year: one per scored call.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Identifier of the score | every row needs a stable id that does not leak counts |
| call_id | uuid | no | FK |  | Scored call; one current score each | AC-US-01-003-1: a scored call has one judgement |
| rubric_id | uuid | no | FK |  | Rubric version used | AC-US-01-004-2: scores keep their version |
| model_call_id | uuid | yes | FK |  | The judge call that produced it | AC-US-01-003-1 ties the one chat call to the score |
| overall_score | numeric(5,2) | yes |  |  | Percent of applicable mandatory and quality items met, zero if any breach; null when the judge failed | the scorecard shows a score per call (AC-US-00-001-1) |
| judge_status | text | no |  |  | ok when the judge produced valid findings, failed otherwise | a call whose judge failed still reaches QA as unscored with its rule findings (REQ-017, HLD review) |
| judge_error | text | yes |  |  | Why the judge failed, safe to show reviewers | reviewers see why a queued call is unscored |
| talk_ratio | numeric(4,3) | no |  |  | Agent speech time over total speech time | AC-US-01-003-4: computed in code (REQ-014) |
| coaching_notes | jsonb | no |  | '[]'::jsonb | Up to three notes from the judge | AC-US-00-002-2 shows them per call |
| needs_review | boolean | no |  |  | Whether routing sent the call to QA | AC-US-01-005-1 to AC-US-01-005-3 |
| review_status | review_status | no |  |  | not_required, pending or done | AC-US-01-006-4: completing a review takes the call off the queue |
| reviewed_by | uuid | yes | FK |  | Reviewer who completed the review | audit of the human decision (AC-US-01-006-4) |
| reviewed_at | timestamptz | yes |  |  | When the review was completed | queue age and agreement over time |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |
| updated_at | timestamptz | no |  | now() | When the row last changed | audit of edits; set by the application on every update |

**Indexes**

- `uq_scores_call_id` on (call_id): one current score per call; FK index.
- `idx_scores_review_queue` on (created_at) WHERE review_status = 'pending': the QA queue, oldest first; the query must repeat WHERE review_status = 'pending'.
- `idx_scores_rubric_id` on (rubric_id): FK index.
- `idx_scores_model_call_id` on (model_call_id): FK index.
- `idx_scores_reviewed_by` on (reviewed_by): FK index.

**Constraints**

- `chk_scores_talk_ratio` refuses a talk ratio outside 0 to 1.
- `chk_scores_overall` refuses a score outside 0 to 100.
- `chk_scores_judge_status` refuses a failed judge with a score, or an unscored call kept out of the QA queue.
- `chk_scores_routing` refuses a risky call marked not required, or a clean call in the queue.
- `chk_scores_review_done` refuses a done review with no reviewer, or a reviewer on an open one.
- `chk_scores_notes_array` refuses more than three coaching notes.

### `findings`: Findings (hot: yes)

One judgement on one rubric item for one call, with its evidence. Serves US-01-003, US-01-005, US-01-006, US-01-007, US-00-002, US-02-002. Volume: 10^6 a year: about 12 per call.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Identifier of the finding | every row needs a stable id that does not leak counts |
| score_id | uuid | no | FK |  | Score the finding belongs to | a rescore replaces the score and its findings together |
| call_id | uuid | no | FK |  | Call, copied from the score for direct reads | agent scorecard and coaching counts filter findings by the agent's calls (US-00-002) |
| item_key | text | no |  |  | Rubric item key, such as guaranteed_returns | AC-US-01-007-1 groups agreement by item |
| item_type | rubric_item_type | no |  |  | mandatory, prohibited or quality | routing reads it (AC-US-01-005-1 and AC-US-01-005-2) |
| status | finding_status | no |  |  | met, missed, partial, breach, clear or not_applicable | AC-US-01-003-2 and AC-US-01-003-3 |
| source | finding_source | no |  |  | llm, rule or reviewer | AC-US-01-003-7 adds rule findings; AC-US-01-006-3 adds reviewer findings |
| quote | text | yes |  |  | Words from the transcript that evidence the finding | REQ-015 links every finding to its quote |
| segment_seq | integer | yes |  |  | Transcript segment cited | tenet 2: times come from this segment |
| start_ms | integer | yes |  |  | Start of the evidence, copied from the segment | AC-US-01-006-1 seeks the player here |
| end_ms | integer | yes |  |  | End of the evidence, copied from the segment | the UI highlights the span |
| channel | speaker_channel | yes |  |  | Who said the quoted words | a breach by the agent differs from words the customer said |
| rationale | text | yes |  |  | Short reason from the judge or reviewer | reviewers decide faster with the judge's reason (US-01-006) |
| grounded | boolean | no |  | true | Whether the quote matched the cited segment | AC-US-01-003-6 marks ungrounded findings and routes them |
| created_by | uuid | yes | FK |  | Reviewer who added a missed finding | AC-US-01-006-3 records who added it |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |

**Indexes**

- `idx_findings_score_id` on (score_id): FK index; load findings of a score.
- `idx_findings_call_id` on (call_id): FK index; call detail.
- `idx_findings_item_key_source` on (item_key, source): agreement per item (US-01-007) and eval reports.
- `uq_findings_llm_item` on (score_id, item_key) WHERE source = 'llm': one judge finding per item per score.
- `idx_findings_created_by` on (created_by): FK index.

**Constraints**

- `chk_findings_times` refuses evidence ending before it starts.
- `chk_findings_reviewer_source` refuses a reviewer finding with no reviewer, or a judge finding claiming one.
- `chk_findings_status_fits_type` refuses a prohibited item marked met, or a mandatory item marked breach.

### `finding_reviews`: Finding reviews (hot: no)

A QA reviewer's agree or disagree on one finding. Serves US-01-006, US-01-007. Volume: 10^5 a year: findings of reviewed calls.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Identifier of the review | every row needs a stable id that does not leak counts |
| finding_id | uuid | no | FK |  | Finding decided on | AC-US-01-006-2: one decision per finding |
| reviewer_id | uuid | no | FK |  | Reviewer who decided | AC-US-01-006-2 saves the reviewer |
| decision | review_decision | no |  |  | agree or disagree | REQ-018 |
| note | text | yes |  |  | Optional reviewer note | AC-US-01-006-2 allows a note; notes may repeat call details |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |
| updated_at | timestamptz | no |  | now() | When the row last changed | audit of edits; set by the application on every update |

**Indexes**

- `uq_finding_reviews_finding_id` on (finding_id): one decision per finding, changed in place; FK index.
- `idx_finding_reviews_reviewer_id` on (reviewer_id): FK index.

**Constraints**

- `chk_finding_reviews_note_length` refuses an unbounded note.

### `audit_events`: Audit events (hot: no)

Who accessed which recording and when. Serves US-02-003. Volume: 10^5 to 10^6 a year: one per recording access.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | bigint | no | PK | generated always as identity | Row id | append-only log; bigint keeps it compact |
| actor_id | uuid | yes | FK |  | User who acted; null for system jobs | AC-US-02-003-2: access is audited by user; the purge job has no user |
| action | text | no |  |  | What happened, such as audio_url_issued | AC-US-02-003-2 names the access |
| call_id | uuid | yes | FK |  | Call acted on | trace which recording was accessed |
| batch_id | uuid | yes | FK |  | Batch acted on (0007) | rename, archive, retry and export happen to a whole batch |
| api_key_id | uuid | yes | FK |  | API key the action was about or made with (0008) | key creation and revocation; batches created through the API |
| created_at | timestamptz | no |  | now() | When the row was created | audit and ordering by recency |

**Indexes**

- `idx_audit_events_call_id` on (call_id): FK index; access history of a call.
- `idx_audit_events_actor_id_created_at` on (actor_id, created_at): FK index; a user's access history.

**Constraints**

- `chk_audit_events_action` refuses an unknown action name.

### `batches`: Batches (hot: no)

Calls uploaded together, by a person in the app or by an API key (migration 0007, ADR-0017). Volume: 10^3 to 10^4 a year.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | The batch id every call carries in calls.batch_id | backfilled from the batch ids calls already had |
| name | text | no |  |  | Name people recognise, 1 to 120 characters | lists and export file names |
| created_by | uuid | no | FK |  | Who started it | only they or a manager may rename or archive it |
| source | text | no |  | 'web' | web or api | shows where a batch came from |
| api_key_id | uuid | yes | FK |  | The key that created it (source api) | traces API uploads to a key |
| archived_at | timestamptz | yes |  |  | When archived: hidden from the list | tidy lists without losing data |
| created_at | timestamptz | no |  | now() | When the first chunk was confirmed | ordering |

**Indexes**: `ix_batches_created` on (created_at desc, id desc) for the list; calls use `idx_calls_batch_id`.

### `api_keys`: API keys (hot: no)

Keys machine clients use, acting as the manager who created them within their scopes (migration 0008, ADR-0018). Volume: tens.

| Column | Type | Null | Key | Default | Description | Why |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | PK | gen_random_uuid() | Key id | |
| name | text | no |  |  | Name of the integration | lists and logs |
| prefix | text | no | UQ |  | 8 characters, shown in place of the key | finds the row without storing the secret |
| secret_hash | bytea | no |  |  | SHA-256 of the 32-byte secret | the secret is shown once and never stored |
| scopes | text[] | no |  |  | What the key may do | least privilege per integration |
| limits | jsonb | no |  | '{}' | Per-bucket overrides of the default limits | fit a busy integration without raising every key |
| created_by | uuid | no | FK |  | The manager the key acts as | the key stops when they stop being a manager |
| last_used_at, expires_at, revoked_at | timestamptz | yes |  |  | Use, expiry and revocation | spot unused keys; end access |

### `api_requests`: API requests (hot: yes)

One row per request made with a key: route template, bucket, status, duration and request id; never the path, query or body. Kept 30 days. Volume: up to 10^6 a month.

**Indexes**: `ix_api_requests_key_created` on (api_key_id, created_at desc) for logs and metrics; `ix_api_requests_created` on (created_at) for the purge.

### `rate_limit_windows`: Rate-limit windows (hot: yes)

A request count per key, bucket and fixed window, upserted on every keyed request so limits hold across API processes. Kept one day. Primary key (api_key_id, bucket, window_start).

### Platform tables (migrations 0009 to 0013)

Added in SCC-1 for webhooks, idempotency, views, alerts, digests, governance, billing and status. Every table has RLS enabled with no policies, like the rest; the API is the only reader.

| Table | Migration | Holds | Key columns | Kept |
| --- | --- | --- | --- | --- |
| `webhook_endpoints` | 0009 | A customer's HTTPS receiver (ADR-0021) | url, events text[], secret_ciphertext (AES-256-GCM), created_by, disabled_at, disabled_reason, consecutive_failures | until deleted |
| `webhook_deliveries` | 0009 | The outbox: one row per event per endpoint | endpoint_id, event_id, event_type, payload jsonb, status, attempts, last_status, last_error, next_attempt_at, delivered_at | 30 days once finished |
| `idempotency_keys` | 0009 | The first response per owner and key (ADR-0022) | PK (owner, key), method, route, request_hash, status, response_status, response_body | 24 hours |
| `saved_views` | 0010 | Named filters per page (ADR-0025) | owner_id, page, name, search jsonb, shared | until deleted |
| `notifications` | 0010 | The in-app inbox (kinds alert, digest and, since 0014, batch) | recipient_id, kind, title, body, link, data jsonb, read_at | not purged yet |
| `alert_rules` | 0010 | When to alert on a metric jump | name, metric, scope, item_key, threshold_points, window_days, baseline_days, min_calls, cooldown_hours, enabled, last_evaluated_at | until deleted |
| `alert_firings` | 0010 | Each time a rule fired, for history and cooldown | rule_id, group_id, group_name, value, baseline, calls, fired_at | with its rule |
| `digest_subscriptions` | 0010 | Who gets a digest and how often | PK profile_id, frequency, last_sent_at | until turned off |
| `billing_prices` | 0013 | The single price list (ADR-0026) | id = 1, currency, usd_rate, per_call, per_audio_minute, model_markup_pct, updated_by | one row |
| `status_checks` | 0013 | One row per component per check | component, ok, latency_ms, detail, checked_at | 90 days |
| `status_notices` | 0013 | Incidents shown on /status | title, body, severity, started_at, resolved_at, created_by | kept |

**New columns**: `calls.input` and `calls.timed` (0014, ADR-0030: `transcript` calls have no audio, and `timed` false means their stored times are an order only); `batches.completed_at` (0009, guards a single `batch.completed` event); `rubrics.product_id` (0011, null is the default rubric, one active rubric per product by partial unique index); `teams.audio_retention_days` (0011, null means `AUDIO_RETENTION_DAYS`); `profiles.disabled_at` (0012, a disabled person is refused).

## 5. MongoDB

n/a (no mongodb store)

## 6. ClickHouse

n/a (no clickhouse store)

## 7. Enumerations

| Enum | Values | Why the set is closed |
| --- | --- | --- |
| `user_role` | qa_reviewer, agent, manager | the three roles the PRD names (REQ-001); a new role is a product decision |
| `call_status` | uploaded, transcribing, transcribed, scoring, scored, failed | the pipeline states of US-01-001 to US-01-003; each is a step a job moves |
| `speaker_channel` | agent, customer | stereo has two channels, left agent and right customer (REQ-005) |
| `rubric_item_type` | mandatory, prohibited, quality | the three item kinds the spec lists (REQ-011 to REQ-013) |
| `finding_status` | met, missed, partial, breach, clear, not_applicable | met, missed and partial for mandatory and quality items; breach and clear for prohibited items; not_applicable when the call gives no occasion |
| `finding_source` | llm, rule, reviewer | who produced the finding: the judge, the rule net (tenet 3) or a QA reviewer adding a miss (Q-008) |
| `review_status` | not_required, pending, done | routing state of US-01-005 and US-01-006 |
| `review_decision` | agree, disagree | the two choices REQ-018 gives a reviewer |
| `model_kind` | chat, stt, tts | the three kinds of model call the gateway makes (ADR-0005 to ADR-0007) |
| `model_call_status` | ok, error, refused | refused records a budget refusal (AC-US-02-001-5) as well as success and failure |

## 8. Retention and personal data

| Table | Lifetime | Rule | Mechanism |
| --- | --- | --- | --- |
| calls (audio object) | 90 days from upload, or the team's `audio_retention_days` | Q-004 assumption, pending confirmation; per team since 0011 | daily purge job deletes the object, sets audio_purged_at, clears storage_path |
| calls (row) | UNDEFINED | owner question Q-009 | none until decided |
| transcript_segments | UNDEFINED | owner question Q-009 | none until decided |
| findings, finding_reviews, scores | UNDEFINED | owner question Q-009 | none until decided |
| model_calls | kept | the budget and spend history need it | none |
| audit_events | UNDEFINED | owner question Q-009 | none until decided |
| agents, profiles | UNDEFINED | owner question Q-009 | none until decided |

Personal data is masked on read in transcripts, quotes and exports (ADR-0023); stored text is unchanged. Personal-data columns: agents.name (agent name), profiles.email (contact), profiles.display_name (name), calls.original_filename (may carry customer name), transcript_segments.text (customer speech), findings.quote (customer or agent speech), finding_reviews.note (free text).

Erasure: a customer erasure request cannot be matched to calls today; no customer identifier is stored. Owner question Q-009.

## 9. Migration plan

1. `0001_initial.sql`: schema.sql as written (new database; no hot table yet). Expand phase only.
3. `0002_upload_once_and_decision_audit.sql`: unique partial index on `calls.storage_path` and two new audit actions (`finding_decided`, `call_retried`), from the security review. calls is small at this stage; build the index `CONCURRENTLY` outside a transaction once it passes 10^6 rows.
2. pg-boss, when it is the queue, creates its own schema on first start; not a migration of ours.

## 10. Rules and deviations

Rules checked: 14 (uuid ids, timestamptz audit columns, NOT NULL by default, explicit ON DELETE, FK indexes, named CHECKs, named indexes, partial indexes repeating predicates, no now() in predicates, enum types for closed sets, comments on every table and column, RLS enabled, bigint identity for high-volume rows, case-insensitive unique email).

- deviation: tenant_id first in composite keys, single-tenant product with one distributor per deployment.
- deviation: profiles.id has no foreign key to auth.users, the schema must apply to a plain Postgres for tests and the Auth schema is owned by Supabase.
- deviation: transcript_segments is not partitioned at 10^6 to 10^7 rows a year, batched delete is enough below 10^7 and retention is undecided.

Expiry: calls.retention_until is a date compared at purge time by the daily job, never in an index predicate; the longest an expired recording survives is one day plus purge failures.

## 11. What the review found

Findings: BLOCKER 0, MAJOR 0, MINOR 0, NIT 0 (open 0). The HLD review (critic, 2026-10-14) drove three changes here: judge_status and judge_error on scores with overall_score nullable so an unscored call still queues for QA; the 50 MB file cap; quotes copied from segments by code (findings.quote). A separate critic pass on the schema: not run, the HLD review covered the same tables.

## 12. Open concerns

- [gap] Retention of rows other than audio is undecided (Q-009). Owner: compliance lead, 2026-10-31. Blocks development: no.
- [gap] Customer erasure cannot locate a customer's calls (Q-009). Owner: compliance lead, 2026-10-31. Blocks development: no.
- [risk] transcript_segments grows 10^6 to 10^7 rows a year; revisit partitioning above 10^7. Owner: engineering, 2027-04-30. Blocks development: no.

## 13. Applying this

data-model: 12 tables, 112 columns, 33 indexes, 23 checks, 10 enums, 7 personal-data columns, 0 problems
schema-apply: docs/design/schema.sql applied to postgres:16, 12 tables
