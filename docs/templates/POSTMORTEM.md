# Postmortem: <incident title>

<!-- Template guidance: every section below carries a comment saying what goes
     there (What), what a strong entry has (Good) and a one-line example
     (Example). Delete each comment when you fill its section. A postmortem
     is read by the next on-call and the team that owns the follow-ups; it
     is blameless (systems and processes, never a person) and due within
     five working days of the incident; if later, say so at the top. -->

- Date of incident, duration, severity
- Author, reviewers
- Task ids for follow-ups

## Summary

<!-- What: three sentences: what broke, who was affected, how it was
     resolved.
     Good: a reader who stops here knows the impact and the fix; numbers,
     not adjectives.
     Example: "Checkout failed for 38 minutes on 12 Sep after release 4.2.1
     exhausted the database pool. About 2,100 customers saw a payment error.
     Rolling back to 4.2.0 restored service at 14:52Z." -->

## Impact

<!-- What: users, requests, revenue, data, with numbers.
     Good: each figure names its source (a dashboard panel, a query, a log
     count); where a number is not known, write "unknown, measure: <how>".
     Example: "Failed checkout requests: 6,480 (API dashboard, 5xx panel,
     14:14Z to 14:52Z); orders lost: 0, all retried (orders table count)." -->

## Timeline

<!-- What: times in UTC with a Z: detection, escalation, each action,
     resolution.
     Good: every row is a fact with a time (an alert, an observation, an
     action, a decision, a message sent); inferred times carry "~"; deploys
     and tags around the incident are included; no names attached to
     mistakes ("release 4.2.1 rolled out", not "X deployed a broken build").
     Example: "14:14Z ApiErrorRateHigh fired; ~14:20Z first customer report
     reached support; 14:41Z rollback to 4.2.0 started." -->

## Root cause

<!-- What: the chain of conditions that produced the incident. Blameless:
     systems and processes, not people.
     Good: written as a chain, "A allowed B, which under C produced D";
     replace every "X forgot" with the condition that let forgetting matter.
     Example: "A pool size set in code rather than config allowed release
     4.2.1 to halve it, which under the lunchtime peak produced connection
     timeouts at checkout." -->

## What went well

<!-- What: what shortened the incident or limited its impact.
     Good: specific enough to keep doing on purpose (an alert, a runbook
     step, a flag); not "the team pulled together".
     Example: "The runbook's first diagnosis step pointed at the pool panel
     within 4 minutes of paging." -->

## What went badly

<!-- What: what lengthened the incident, widened the impact or slowed
     detection.
     Good: conditions, not people; each item is the seed of a follow-up.
     Example: "No alert on pool saturation; the first signal was a customer
     report 6 minutes after errors began." -->

## Follow-ups

<!-- What: actions that stop this recurring or shorten the next one, one row
     each.
     Good: every row has an owner, a task id (or <TASK> placeholder) and a
     due date; a follow-up without an owner is deleted, not left. Concrete
     ("alert when queue depth over N for M minutes, runbook Y"), never "add
     more monitoring". One row is always the runbook: confirm the incident
     doc records it as updated, or add "update docs/runbooks/<alert>.md with
     the response".
     Example row: | Alert on DB pool above 90 percent for 5 min, runbook DbPoolSaturated | payments team | PAY-412 | 2026-09-30 | -->

| Action | Owner | Task | Due |
| --- | --- | --- | --- |

## Lessons

<!-- What: what we now believe about the system that we did not before.
     Good: one line each, a belief about the system that changed; not a
     restated follow-up.
     Example: "Pool size is a capacity setting, and capacity settings changed
     in code skip the load review." -->
