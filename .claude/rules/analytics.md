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

# Analytics rules

- Product events are designed before they are emitted, in the event design
  sheet (`analytics-events`) under `docs/analytics/`.
- Code emits exactly what the sheet lists: same names, same properties. An
  event not in the sheet is a bug; `analytics-events` audits code against it.
- No PII in event properties.
