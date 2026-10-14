# PRD: Sales Call Compliance and Coaching Intelligence

Source: brief pasted in the session of 2026-10-14 (project, AI depth, description, use case, spec, suggestions; 11 paragraphs) plus answers given in the same session.   Normalised: 2026-10-14
Owner: unconfirmed: the requester   Tracker epic: unconfirmed: tracker is none

## 1. Problem

An insurance distributor audits only a 2% sample of its 20,000 monthly sales and service calls (use case). Mis-selling claims such as "guaranteed returns" are found late or not at all, and agents get no specific coaching on the items they miss most (use case). Manual QA scores are the only reference, so any automated judge must be measured against them (AI depth, description).

## 2. Business objectives

| Id | Objective | Target (measurable) | Source |
| --- | --- | --- | --- |
| B1 | Every call is audited, not a sample | target: unconfirmed (use case names 20,000 calls a month, 100% coverage) | use case |
| B2 | Prohibited claims are caught quickly | target: unconfirmed (use case says "within a day") | use case |
| B3 | Each agent is coached on the three things they miss most | target: unconfirmed | use case, spec "top three coaching points" |
| B4 | The automated judge is trusted because it is measured against human QA | target: unconfirmed; the eval gate requires zero missed planted prohibited statements | AI depth, spec "Evals" |

## 3. Non-goals

- Live call monitoring (spec, "Out of scope").
- Dialler integration (spec, "Out of scope").
- Objection-handling scoring (spec, "Out of scope").
- Interruption scoring (spec, "Out of scope").
- Diarisation: recordings are stereo with one speaker per channel (spec).

## 4. Personas

| Persona | Group | Who they are | What they need | Source |
| --- | --- | --- | --- | --- |
| QA reviewer | 01 admin | Quality assurance staff who audit calls | A queue of risky calls with evidence, and a way to agree or disagree with each finding | spec "Roles" |
| Sales agent | 00 end user | Agent whose calls are scored | Their own scorecard and top three coaching points | spec "Roles", "Agent view" |
| Manager | 01 admin | Leads teams of agents | Results by team and product; uploads; rubric configuration | spec "Roles", "Stretch" |

## 5. Requirement statements

One testable statement per id. Ids are never reused or renumbered.

| Id | Statement | Persona | Source | Flags |
| --- | --- | --- | --- | --- |
| REQ-001 | The system restricts each user to the permissions of one role: QA reviewer, sales agent or manager. | all | spec "Roles: QA reviewer, sales agent, manager" | none |
| REQ-002 | The system accepts stereo call recordings in WAV and MP3 format. | QA reviewer, Manager | spec "Upload stereo call recordings (WAV, MP3)" | none |
| REQ-003 | The system accepts a single recording or a small batch of recordings in one upload. | QA reviewer, Manager | spec "singly or as a small batch" | ambiguous: Q-001 |
| REQ-004 | The system records agent, team, product and call date for each uploaded recording. | QA reviewer, Manager | spec "with metadata (agent, team, product, date)" | none |
| REQ-005 | The system treats the left channel as the agent and the right channel as the customer. | all | spec "the agent is on the left channel and the customer on the right" | none |
| REQ-006 | The system transcribes each channel in a background job, not in the upload request. | all | spec "A background job transcribes each channel" | none |
| REQ-007 | The system produces timestamps for every transcribed segment. | all | spec "with timestamps" | none |
| REQ-008 | The system transcribes English, Hindi and code-mixed English-Hindi speech. | all | spec "in English and Hindi including code-mixed speech" | none |
| REQ-009 | The system scores each call against the rubric with exactly one model call per call. | all | spec "One model call per call scores the transcript" | none |
| REQ-010 | The system lets the rubric be configured. | Manager | spec "a configurable rubric" | none |
| REQ-011 | The system checks the mandatory items greeting, identity check, disclosure, consent and cooling-off period. | all | spec "mandatory items (...)" | none |
| REQ-012 | The system detects the prohibited statements guaranteed returns, false urgency and misrepresentation. | all | spec "prohibited statements (...)" | none |
| REQ-013 | The system scores the quality item need discovery. | all | spec "two quality items (need discovery, ...)" | none |
| REQ-014 | The system computes talk ratio in code, not with a model. | all | spec "talk ratio computed in code" | none |
| REQ-015 | The system links every finding to its timestamp and quote. | QA reviewer, Sales agent | spec "Every finding links to its timestamp and quote" | none |
| REQ-016 | The system plays the recording from a finding's timestamp in the UI. | QA reviewer, Sales agent | spec "playable in the UI" | none |
| REQ-017 | The system sends to QA every call with a prohibited statement or a missing mandatory item. | QA reviewer | spec "Calls with a prohibited statement or a missing mandatory item go to QA" | none |
| REQ-018 | The system lets a QA reviewer agree or disagree with each finding. | QA reviewer | spec "the reviewer agrees or disagrees with each finding" | none |
| REQ-019 | The system tracks judge-to-human agreement per rubric item. | Manager, QA reviewer | spec "tracks judge-to-human agreement per rubric item" | none |
| REQ-020 | The system shows each agent a scorecard. | Sales agent | spec "Agent view: scorecard" | none |
| REQ-021 | The system shows each agent their top three coaching points. | Sales agent | spec "top three coaching points"; use case "the three things they miss most" | none |
| REQ-022 | The system routes every model call through one gateway function. | team | spec "All model calls go through one gateway function" | none |
| REQ-023 | The gateway lets the provider be configured among OpenRouter, Gemini and Groq. | team | spec "on OpenRouter, gemini or groq etc.. (configsable)" | none |
| REQ-024 | The gateway caps max_tokens at 1000 on every call. | team | spec "max_tokens capped at 1000" | none |
| REQ-025 | The gateway logs tokens and cost for every call. | team, Manager | spec "the gateway logs tokens and cost per call" | none |
| REQ-026 | The gateway refuses calls once the running cost total passes a configurable USD budget. | team | spec "refuses calls once the running total passes USD XYZ (configable)" | none |
| REQ-027 | The test suite replays recorded model responses so CI makes no live model calls. | team | spec "tests replay recorded responses so CI makes no live calls" | none |
| REQ-028 | The eval set contains 20 labelled calls with planted breaches. | team | spec "Evals: 20 labelled calls with planted breaches" | none |
| REQ-029 | The eval reports agreement per rubric item. | team | spec "per-item agreement" | none |
| REQ-030 | The eval gate fails if any planted prohibited statement is missed. | team | spec "a gate that fails if any planted prohibited statement is missed"; suggestions "make it the gate" | none |
| REQ-031 | The system shows managers results by team and product. | Manager | spec "Stretch: a manager dashboard by team and product" | none (stretch) |
| REQ-032 | The repository seeds 20 synthetic calls whose scripts and labels are written by Claude Code and whose two speakers are rendered to separate channels. | team | spec "Seed 20 synthetic calls ..." | none |
| REQ-033 | The system gives each agent coaching notes for each call. | Sales agent | description "gives each agent coaching notes" | none |
| REQ-034 | The system flags risky calls with timestamps. | QA reviewer | description "flags risky calls with timestamps" | none |
| REQ-035 | The system keeps call recordings private. | all | suggestions "privacy for recordings" | ambiguous: Q-004 |
| REQ-036 | The system guards the model's input and output. | team | suggestions "guardrails" | ambiguous: Q-005 |

## 6. Constraints

- Frontend: React, TypeScript and coss ui (brief, last paragraph).
- Backend: Express with TypeScript (brief, last paragraph).
- Database: PostgreSQL on Supabase, a hosted project (brief; session answer).
- TypeScript only; no Python and no locally run models (session answer replacing the brief's faster-whisper and Piper).
- Speech-to-text: Groq Whisper over the API (session answer; replaces "faster-whisper (smaller)" in the spec).
- Seed audio: Groq Orpheus TTS (session answer; replaces Piper in the spec). English voices only.
- Default model provider: Groq (session answer).
- max_tokens at most 1000 per call; a USD budget cap (spec).
- No live model calls in CI (spec).
- Groq base rate limits as pasted in the session: Whisper 20 RPM and 7,200 audio seconds per hour; gpt-oss-120b 8K TPM and 200K TPD; Orpheus 100 requests per day.
- Scale reference: 20,000 calls a month (use case).

## 7. Open questions

8 entries in docs/product/questions.md: 8 open, 5 need your confirmation (Q-001, Q-002, Q-003, Q-004, Q-006).

## 8. Could not extract

- Owner and tracker epic: the requester can name them.
- Business targets with dates: the requester or the distributor's compliance lead.
- Retention period for recordings: the distributor's compliance lead.

## 9. Glossary

| Term | Meaning | Source |
| --- | --- | --- |
| Finding | One judgement on one rubric item for one call, with quote and timestamp | spec |
| Mandatory item | Something the agent must do on every call (greeting, identity check, disclosure, consent, cooling-off) | spec |
| Prohibited statement | Something the agent must never say (guaranteed returns, false urgency, misrepresentation) | spec |
| Cooling-off period | The window in which the customer may cancel a policy without penalty, which the agent must state | spec |
| Talk ratio | Share of call speech time spoken by the agent | spec |
| Planted breach | A violation deliberately written into a synthetic eval call, with a label | spec |
| Judge | The model call that scores a transcript against the rubric | AI depth |
| Code-mixed | Speech that switches between Hindi and English within a call or sentence | spec |
