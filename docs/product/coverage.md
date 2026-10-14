# Coverage: PRD statements to stories

PRD: docs/product/PRD.md   Backlog: docs/product/backlog.md   Built: 2026-10-14

## Matrix

| REQ | Statement (short) | Judgement | Why | Covered by | AC ids |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The system restricts each user to the permissions of one role: QA revi | story | an observable capability; combined with related statements into the story that ships it | US-00-003 | AC-US-00-003-1, AC-US-00-003-2, AC-US-00-003-3 |
| REQ-002 | The system accepts stereo call recordings in WAV and MP3 format. | story | an observable capability; combined with related statements into the story that ships it | US-01-001 | AC-US-01-001-1, AC-US-01-001-3 |
| REQ-003 | The system accepts a single recording or a small batch of recordings i | story | an observable capability; combined with related statements into the story that ships it | US-01-001 | AC-US-01-001-2, AC-US-01-001-3 |
| REQ-004 | The system records agent | story | an observable capability; combined with related statements into the story that ships it | US-01-001 | AC-US-01-001-1 |
| REQ-005 | The system treats the left channel as the agent and the right channel  | story | an observable capability; combined with related statements into the story that ships it | US-01-001 | AC-US-01-001-4, AC-US-01-001-5 |
| REQ-006 | The system transcribes each channel in a background job | story | an observable capability; combined with related statements into the story that ships it | US-01-002 | AC-US-01-002-1, AC-US-01-002-5 |
| REQ-007 | The system produces timestamps for every transcribed segment. | story | an observable capability; combined with related statements into the story that ships it | US-01-002 | AC-US-01-002-2, AC-US-01-002-3 |
| REQ-008 | The system transcribes English | story | an observable capability; combined with related statements into the story that ships it | US-01-002 | AC-US-01-002-4 |
| REQ-009 | The system scores each call against the rubric with exactly one model  | story | an observable capability; combined with related statements into the story that ships it | US-01-003 | AC-US-01-003-1 |
| REQ-010 | The system lets the rubric be configured. | story | an observable capability; combined with related statements into the story that ships it | US-01-004 | AC-US-01-004-1, AC-US-01-004-2, AC-US-01-004-3 |
| REQ-011 | The system checks the mandatory items greeting | story | an observable capability; combined with related statements into the story that ships it | US-01-003 | AC-US-01-003-2 |
| REQ-012 | The system detects the prohibited statements guaranteed returns | story | an observable capability; combined with related statements into the story that ships it | US-01-003 | AC-US-01-003-3, AC-US-01-003-7 |
| REQ-013 | The system scores the quality item need discovery. | story | an observable capability; combined with related statements into the story that ships it | US-01-003 | AC-US-01-003-4 |
| REQ-014 | The system computes talk ratio in code | criterion-of US-01-003 | a rule on how one scoring output is computed | US-01-003 | AC-US-01-003-4 |
| REQ-015 | The system links every finding to its timestamp and quote. | story | an observable capability; combined with related statements into the story that ships it | US-01-005 | AC-US-01-005-4 |
| REQ-016 | The system plays the recording from a finding's timestamp in the UI. | story | an observable capability; combined with related statements into the story that ships it | US-01-006 | AC-US-01-006-1 |
| REQ-017 | The system sends to QA every call with a prohibited statement or a mis | story | an observable capability; combined with related statements into the story that ships it | US-01-005 | AC-US-01-005-1, AC-US-01-005-2, AC-US-01-005-3 |
| REQ-018 | The system lets a QA reviewer agree or disagree with each finding. | story | an observable capability; combined with related statements into the story that ships it | US-01-006 | AC-US-01-006-2, AC-US-01-006-3, AC-US-01-006-4 |
| REQ-019 | The system tracks judge-to-human agreement per rubric item. | story | an observable capability; combined with related statements into the story that ships it | US-01-007 | AC-US-01-007-1, AC-US-01-007-2 |
| REQ-020 | The system shows each agent a scorecard. | story | an observable capability; combined with related statements into the story that ships it | US-00-001 | AC-US-00-001-1, AC-US-00-001-2, AC-US-00-001-3 |
| REQ-021 | The system shows each agent their top three coaching points. | story | an observable capability; combined with related statements into the story that ships it | US-00-002 | AC-US-00-002-1, AC-US-00-002-3 |
| REQ-022 | The system routes every model call through one gateway function. | story | an observable capability; combined with related statements into the story that ships it | US-02-001 | AC-US-02-001-1 |
| REQ-023 | The gateway lets the provider be configured among OpenRouter | story | an observable capability; combined with related statements into the story that ships it | US-02-001 | AC-US-02-001-2 |
| REQ-024 | The gateway caps max_tokens at 1000 on every call. | criterion-of US-02-001 | a limit on the gateway | US-02-001 | AC-US-02-001-3 |
| REQ-025 | The gateway logs tokens and cost for every call. | story | an observable capability; combined with related statements into the story that ships it | US-02-001 | AC-US-02-001-4 |
| REQ-026 | The gateway refuses calls once the running cost total passes a configu | story | an observable capability; combined with related statements into the story that ships it | US-02-001 | AC-US-02-001-5 |
| REQ-027 | The test suite replays recorded model responses so CI makes no live mo | criterion-of US-02-001 | a property of the gateway test harness | US-02-001 | AC-US-02-001-6 |
| REQ-028 | The eval set contains 20 labelled calls with planted breaches. | story | an observable capability; combined with related statements into the story that ships it | US-02-002 | AC-US-02-002-1 |
| REQ-029 | The eval reports agreement per rubric item. | story | an observable capability; combined with related statements into the story that ships it | US-02-002 | AC-US-02-002-3 |
| REQ-030 | The eval gate fails if any planted prohibited statement is missed. | story | an observable capability; combined with related statements into the story that ships it | US-02-002 | AC-US-02-002-4 |
| REQ-031 | The system shows managers results by team and product. | story | an observable capability; combined with related statements into the story that ships it | US-01-008 | AC-US-01-008-1, AC-US-01-008-2 |
| REQ-032 | The repository seeds 20 synthetic calls whose scripts and labels are w | story | an observable capability; combined with related statements into the story that ships it | US-02-002 | AC-US-02-002-1, AC-US-02-002-2 |
| REQ-033 | The system gives each agent coaching notes for each call. | story | an observable capability; combined with related statements into the story that ships it | US-00-002 | AC-US-00-002-2 |
| REQ-034 | The system flags risky calls with timestamps. | story | an observable capability; combined with related statements into the story that ships it | US-01-005 | AC-US-01-005-1 |
| REQ-035 | The system keeps call recordings private. | story | privacy needs its own operator-facing behaviour: signed URLs, audit, purge | US-02-003 | AC-US-02-003-1, AC-US-02-003-2, AC-US-02-003-3, AC-US-02-003-4, AC-US-02-003-5 |
| REQ-036 | The system guards the model's input and output. | non-functional | a quality carried as criteria of the scoring story, not a user action | US-01-003 | AC-US-01-003-5, AC-US-01-003-6, AC-US-01-003-7 |

## Gaps

| REQ | Why uncovered | Proposed action |
| --- | --- | --- |
| none | | |

## Orphan stories

| Story | Reason it exists | Action |
| --- | --- | --- |
| none | | |

## Counts

stories-coverage: 36 REQ from docs/product/PRD.md (0 withdrawn), 36 covered, 0 out of scope, 0 gaps, 14 stories, 56 AC, 0 orphans, 0 problems
Verdict: covered
