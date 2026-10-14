---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/*_test.go"
  - "**/test_*.py"
  - "**/tests/**"
  - "**/__tests__/**"
  - "**/*Test.kt"
  - "**/*Tests.swift"
  - "**/*_test.dart"
---

# Testing rules (loaded when a test file is touched)

- Test first when the behaviour is known (Superpowers
  `test-driven-development`). The test must be seen failing before the
  code that passes it exists.
- Every bug fix ships with the test that reproduces the bug against the
  unfixed code. Say so in a one-line comment with the task id.
- One behaviour per test, named after the behaviour: `rejects expired
  token`, not `testValidate2`.
- Arrange, act, assert, in that order, with a blank line between them. No
  logic in tests: no loops that decide what to assert, no conditionals.
- Unit tests for logic, integration tests against a real database in
  Docker for repositories (in a transaction rolled back after each test,
  never against shared state), an end-to-end test for every user-facing
  flow that matters (Playwright, Detox or Maestro, XCTest UI, Espresso).
- Deterministic: inject the clock, seed the random source, stub the
  network. A `sleep` in a test is a bug.
- Mirror the nearest existing test's fixtures and helpers. Do not invent a
  new fixture style for one file.
- Snapshot tests only for serialised output that is reviewed on change;
  never for component trees.
- Never `.only`, never `skip` without a task id and a reason.
- Run the narrowest selection that proves the change while working; the
  full `make check` once at the end.
