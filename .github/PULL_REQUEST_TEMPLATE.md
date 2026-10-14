<!-- Template guidance: the description a reviewer reads before the diff, so
     they know why the change exists, how to check it and how to undo it.
     Every comment says what goes there (What), what a strong entry has
     (Good) and an example (Example). Delete each comment when you fill its
     section. No em dashes, no self-praise, no line that only says the work matches the request. -->

<!-- Title: type(scope): imperative summary [TASK-ID]   (same shape as a commit subject)
     Example: "fix(upload): retry S3 multipart on 503 [ENG-412]" -->

## Summary

<!-- What: two or three sentences on why this change exists, then the
     Closes line.
     Good: the reason and its effect on a user or an operator, not a tour of
     the diff; with no task id, say so here.
     Example: "Uploads over 100 MB failed about once in 40 because a single
     S3 503 aborted the whole multipart upload. Each part now retries." -->

Closes TASK-ID

## Context

<!-- What: what was true before and what made it a problem.
     Good: links the task, the ADR or the incident that a reviewer can open;
     a number where one exists.
     Example: "INC-0931: 14 failed uploads on 18 Sep; the client showed a
     generic error and support re-sent the files by hand." -->

## Approach

<!-- What: the shape of the change and the alternatives you rejected, in a
     few lines.
     Good: names the files or modules that carry the change; over 400
     changed lines, proposes the split here.
     Example: "Retry lives in internal/upload/multipart.go with 3 attempts
     and jittered backoff; retrying the whole upload was rejected (re-sends
     up to 5 GB)." -->

## How to test

<!-- What: numbered steps a reviewer can run to see the change work.
     Good: each step is a command or an action with the result to expect;
     for a UI change, a before and after screenshot placeholder is left and
     the report says so.
     Example: "1. make dev-up  2. UPLOAD_FAULT=503:part3 make run  3. upload
     fixtures/big.bin: it completes and the log shows part=3 attempt=2." -->

1.
2.
3.

## Verification

<!-- What: the gate output, pasted verbatim, under the command that
     produced it.
     Good: the tail of make check ending in "check: passed"; an improvised
     gate (go test ./..., pnpm test) is named as improvised, since it proves
     less; an uncommitted tree is stated here.
     Example: "make check, last lines: ok  internal/upload 2.41s, then
     check: passed" -->

```
make check
```

## Risk and rollback

<!-- What: what could go wrong in production, how you would notice, and how
     to roll back (revert, flag, migration Down).
     Good: names the signal that would show the failure (a metric, a log
     line, an alert) and the exact rollback step, not "revert if needed".
     Example: "Risk: retries raise S3 request cost. Watch
     upload_part_retry_total; rollback: set UPLOAD_PART_RETRIES=0, no
     deploy." -->

## Checklist

<!-- What: the standard checks for every change.
     Good: tick only what you verified yourself (definition-of-done output when it
     ran); leave the rest unticked with a reason after the item. Never tick
     the regression test without having opened the test file.
     Example: "- [ ] Under 400 changed lines, or the reason is in Approach
     (612 lines: split proposed in Approach)" -->

- [ ] `make check` passes locally (output above)
- [ ] Tests cover the change; a bug fix has its regression test
- [ ] Boundary schemas, error mapping, logs and metrics for the new path
- [ ] Analytics events match the event sheet, or none were added
- [ ] No new dependency, no suppressed lint, no lowered threshold
- [ ] `.env.example` and docs updated, or nothing changed
- [ ] Under 400 changed lines, or the reason is in Approach
- [ ] Commits are Conventional, carry the task id, no AI trailer
- [ ] Reviewed by one peer and one lead
