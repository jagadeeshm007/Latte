# UX flows and screen inventory

Serves: all stories. Design system: coss ui on Tailwind v4 tokens (ADR-0008). Date: 2026-10-14.

## Direction

A calm, dense work tool for people who review dozens of calls a day: neutral surfaces, one accent colour (indigo) for actions, semantic colours only for risk (red for breach, amber for missed or unscored, green for met). Tabular numbers, compact tables, the audio player always reachable on the call screen. Light and dark themes from the same tokens.

## Screens

| # | Screen | Roles | Stories | States |
| --- | --- | --- | --- | --- |
| S1 | Sign in | all | US-00-003 | empty, submitting, wrong credentials, network error |
| S2 | Calls (list) | QA, manager | US-01-001, US-01-002 | loading, empty ("No calls yet, upload one"), list with status badges, failed rows with Retry, error |
| S3 | Upload | QA, manager | US-01-001 | empty drop zone, files chosen with per-file metadata, uploading with progress per file, partial failure, done (link to calls), over-limit message |
| S4 | Call detail | QA, manager, agent (own) | US-01-005, US-01-006, US-00-002, US-02-003 | loading, transcribing (progress text), scored, unscored (judge failed banner), audio purged, not found |
| S5 | Review queue | QA | US-01-005 | loading, empty ("Queue is clear"), list oldest first with flags |
| S6 | Review (S4 in review mode) | QA | US-01-006 | per-finding agree/disagree, add missed finding dialog, complete review enabled when all decided |
| S7 | My scorecard | agent | US-00-001, US-00-002 | loading, no scored calls, scorecard with top three coaching points and recent calls |
| S8 | Dashboard | manager | US-01-007, US-01-008, US-02-001 | loading, empty, by team or product, agreement per item, spend vs budget |
| S9 | Rubric | manager (QA read-only) | US-01-004 | view active version, edit, save as new version, validation errors, history |

Every role's home: QA lands on S5, manager on S8, agent on S7 (AC-US-00-003-1).

## Flow F1: upload to review (QA reviewer)

| Step | Screen | The user | The system | Story |
| --- | --- | --- | --- | --- |
| 1 | S3 | drops 3 files, picks agent, team, product, date per file | validates type and size per file | US-01-001 |
| 2 | S3 | clicks Upload | signs, uploads directly with progress, confirms each | US-01-001 |
| 3 | S2 | sees 3 rows "uploaded" then "transcribing", "scoring", "scored" | worker jobs | US-01-002, US-01-003 |
| 4 | S5 | opens the queue | flagged calls, oldest first | US-01-005 |
| 5 | S6 | clicks a breach finding | player seeks and plays | US-01-006 |
| 6 | S6 | agrees, disagrees, adds a missed item, completes | saved; call leaves queue | US-01-006 |

Failures: a mono file (call failed with the stereo message, Retry hidden: nothing to retry); budget exhausted (failed with Retry); judge failed (call in queue as unscored).

## Flow F2: agent coaching

| Step | Screen | The user | The system | Story |
| --- | --- | --- | --- | --- |
| 1 | S1 | signs in | lands on S7 | US-00-003 |
| 2 | S7 | reads top three coaching points | counts misses over 90 days, excludes findings QA rejected | US-00-002 |
| 3 | S4 | opens a call, clicks a finding | player seeks; notes shown | US-00-002 |

## Flow F3: manager

S8 by team, then by product, then agreement per item; S9 edit rubric and save as a new version.

Dead-end check: every screen has a way back to the role home in the top bar; every error state offers retry or a link home.
