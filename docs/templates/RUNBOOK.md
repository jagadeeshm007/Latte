# Runbook: <alert name exactly as it fires>

<!-- Template guidance: every section below carries a comment saying what goes
     there (What), what a strong entry has (Good) and a one-line example
     (Example). Delete each comment when you fill its section. A runbook is
     read at 3 a.m. by an on-call engineer who did not write the service:
     one alert, one runbook, file named as the alert fires
     (docs/runbooks/<alert-name>.md). Every command is copy-pasteable with
     placeholders in angle brackets; no credentials and no production
     database hostnames (point at the secret manager and the inventory). -->

- Service:
- Severity:
- Owner (team, on-call rotation):
- Dashboard:
- Last verified: not run (or YYYY-MM-DD with the diagnosis output quoted below)

## What this alert means

<!-- What: one paragraph: the condition, the threshold, the window, and why
     we alert on it.
     Good: quotes the rule's expression or names the rule file
     (monitoring/alerts/api.yaml), or says "alert rule: not in this
     repository"; says which user promise the threshold protects.
     Example: "Fires when 5xx responses exceed 1 percent of API requests for
     5 minutes (monitoring/alerts/api.yaml, ApiErrorRateHigh); at that rate
     the monthly error budget is gone in under two days." -->

## User impact

<!-- What: what a user experiences while this is firing.
     Good: names the journey and the symptom the user sees (an error page,
     a spinner, a missing email), and who is spared; not "service degraded".
     Example: "Customers see 'Payment could not be completed' at checkout;
     browsing and basket still work." -->

## Diagnosis

<!-- What: numbered steps, each the exact command or dashboard panel, and
     what a healthy versus an unhealthy result looks like.
     Good: every command runs as pasted once the angle-bracket placeholders
     are filled; each step says what to conclude from the output. When the
     steps were run for "Last verified", quote each step's output under it.
     Example: "1. kubectl -n <namespace> get pods -l app=api. Healthy: all
     Running, restarts 0. Unhealthy: CrashLoopBackOff, go to Remediation 2." -->

## Remediation

<!-- What: numbered steps for the common causes, most likely first.
     Good: ordered by likelihood; each step says how to confirm it worked
     (the panel or command and the value to expect); the person runs it,
     nothing is automatic.
     Example: "1. Last deploy is the cause: follow Rollback. Confirm: the 5xx
     panel on the API dashboard drops under 0.1 percent within 5 minutes." -->

## Rollback

<!-- What: how to back out the last change if that is the cause.
     Good: names the mechanism (a revert and redeploy, a flag turned off, a
     migration Down) with the exact command, and says when rollback is not
     safe (a migration that dropped a column).
     Example: "make deploy TAG=<previous release tag>; if the release ran a
     migration, run its Down first: make migrate-down STEPS=1." -->

## Escalation

<!-- What: who to page when the steps above do not resolve it, and after how
     long.
     Good: names a rotation or team, never a person, with the time limit and
     the channel.
     Example: "After 30 minutes without recovery, page the payments-oncall
     rotation in PagerDuty and post in #inc-payments." -->

## After

<!-- What: what to record, and whether a postmortem is required.
     Good: says where the timeline goes (the incident doc), that this
     runbook is updated with what the responders actually did (commands
     that worked, a signal that misled, a missing step), and when a
     postmortem is due.
     Example: "Record the timeline in docs/postmortems/<date>-<title>-incident.md;
     sev 1 to 3 need a postmortem (postmortem) within five working days." -->
