---
paths:
  - "src/**"
  - "app/**"
  - "lib/**"
  - "internal/**"
  - "cmd/**"
  - "pkg/**"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.go"
  - "**/*.py"
  - "**/*.kt"
  - "**/*.swift"
  - "**/*.dart"
---

# Observability rules

- Every service exposes health and readiness endpoints, structured logs,
  request metrics (rate, errors, duration) and traces with the request id
  propagated across calls (`observability`, `logging`,
  `health-checks`).
- Every alert has a runbook under `docs/runbooks/` (`runbook`) before
  the alert is enabled.
- Every incident gets a postmortem (`postmortem`) within five working
  days.
- A new code path is not done until its logs, metrics and traces exist
  (definition of done, item 5).
