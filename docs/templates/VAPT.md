# VAPT report: <system> <version>

<!-- Template guidance: every section below carries a comment saying what goes
     there (What), what a strong entry has (Good) and a one-line example
     (Example). Delete each comment when you fill its section. This report is
     the release's written security position, read by the release approver
     and by auditors later; it turns scanner findings, confirmed at the
     release commit, into a decision. The collector's counts line goes in
     Method verbatim; the report's totals are after triage (merged by root
     cause, refuted rows out, findings from outside the scanners in).
     No secrets, tokens or real PII anywhere, even redacted-looking ones.
     The header list: scope names services, URLs or apps and the release
     commit (or "scope derived from code", "whole codebase"); Method names
     each source exactly as the collector printed it, with report path,
     scanned commit or date and verification status; a stale scan accepted
     by the user and the fallback auditor are named as such.
     Example: "Method: claude-security CLAUDE-SECURITY-20260921/CLAUDE-SECURITY-RESULTS.jsonl
     at 3f9a1c07b2e4 (verified); insecure-defaults, scope `.`" -->

- Scope (services, URLs, apps, commit)
- Method: each scanner with its report path, the commit or date it
  scanned, its coverage (the changes since a tag, or the whole codebase)
  and its verification status (claude-security, gstack /cso), or the
  fallback review, named as such; what was looked at outside the scanners
- Date, authors, reviewers

## Findings

<!-- What: one row per finding from .scratch/vapt-findings.json and the
     insecure-defaults pass, highest severity first.
     Good: reproduction a person can run without the conversation (a curl,
     a screen path, a request body); fix at a file:line; Sources names every
     scanner that found it (a second source on the same file and line joins
     the row, never a second row); Threat cites the threat id when the
     finding breaks a mitigation; every Critical and High has an owner and a
     task id. Status is "fixed" only when the fix commit is in the range.
     A secret finding names file, line and secret type, never the value.
     Example: | 1 | High | authz | Invoice fetch skips tenant check | `curl -H "Authorization: Bearer $TENANT_B" https://api.example.test/v1/invoices/9121` returns tenant A's invoice | scope query by tenant_id at internal/billing/invoice.go:88 | claude-security F-14, /cso #3 (confidence 8) | T-07 | Rahul S., SEC-212 | open | -->

| # | Severity | Area | Title | Reproduction | Fix | Sources | Threat | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Severity: Critical = unauthenticated data access or code execution; High =
authenticated cross-tenant access or secret exposure; Medium = needs an
unusual precondition; Low = hardening.

## Refuted

<!-- What: scanner rows the release commit's code disproves, each with the
     quoted line that decides it. They are not counted above.
     Good: the file:line and the code that refutes the claim, read at the
     release commit, not the working tree; "none" when every row held.
     Example: "/cso #3 preview returns another tenant's file: refuted,
     internal/files/handler.go:64 compares f.TenantID with the session." -->

## Checked, none found

<!-- What: one line per checklist item from SECURITY.md that was examined
     and produced no finding. Without SECURITY.md, say so and list the
     scanners' own coverage instead.
     Good: each line says what was checked and by which source, so "none
     found" is evidence, not silence; an item nobody examined is not listed
     here. An insecure-defaults status of no-candidates reads "0 candidates",
     not "clean".
     Example: "SQL injection: /cso phase 4 over internal/store/, 0 findings." -->

## Threat model

<!-- What: the threats read from docs/security/threat-model-*.md, the ones a
     finding shows unmitigated (by id), and the planned mitigations still
     open at this release. No threat model: write "no threat model" and
     recommend threat-model.
     Good: the three counts (read, linked to a finding, planned still open)
     and the ids behind each; a planned threat with no mitigation in the
     range is named as open risk, not dropped.
     Example: "14 threats read; T-07 linked to finding 1; T-11 (rate limit on
     /login) planned, still open." -->

## Not done

<!-- What: what this report did not do (no dynamic test of a running
     service, no scanner run at the release commit, code outside the range
     not reviewed) and what clearing would need.
     Good: each gap named with the step that would close it, so nobody
     reads silence as coverage.
     Example: "No dynamic test of a deployed instance; claude-security not
     rerun at the release commit (run 'scan changes' from v2.0.0 after the
     fixes)." -->

## Release decision

<!-- What: one of cleared, blocked (<n> Critical/High open), or cleared,
     pending a scanner run; then the sign-off.
     Good: any open Critical or High, whatever found it (a scanner,
     insecure-defaults or this review), means blocked; a report built only on the fallback
     review reaches "cleared, pending a scanner run" at best; the signer is
     a named person with a date.
     Example: "Blocked (1 High open: finding 1, SEC-212). Signed off by:
     Meera K., security lead, 2026-09-24." -->

Critical and High must be fixed before production. Signed off by:
