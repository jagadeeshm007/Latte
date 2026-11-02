# Progress: SCC-11 DemoMode

- Task: SCC-11
- Title: DemoMode
- Branch: feature/SCC-11-DemoMode (Unit: feature/SCC-11-1-DemoMode)
- Status: in review
- Owner: Jagadeesh Mandala
- Started: 2026-11-02
- Updated: 2026-11-02
- Acceptance criteria: 9

## Next
- SCC-11-1: security scan of the branch (`/cso --diff` or claude-security), branch-review, definition-of-done, merge request into feature/SCC-11-DemoMode
- After the Intent merges to main: migrate, set DEMO_SECRET and DEMO_MODE=true in Vercel production, `make demo-seed`, redeploy, verify (docs/runbooks/deploy-vercel.md, Demo mode)

## Done
- SCC-11-1-1 to SCC-11-1-10: demo schema and second pool, demo sessions and tokens, allowlist and leak sweep, one upload per device and the daily cap, demo jobs, cleanup, seed, web button and banner, ADR-0033 and runbook

## Blockers
- none

## Decisions
- The demo lives inside production, in a `demo` schema reached through a second pool (ADR-0033); the owner chose this over a separate demo deployment
- Visitors are random ids; the device hash (IP and browser signals) is only the upload limit key
- The demo visitor is a manager with admin pages blocked; review actions are QA-only, so the demo has none
- One upload per device, plus DEMO_DAILY_UPLOADS (default 50) across visitors per UTC day

## Links
- Spec: docs/superpowers/specs/2026-11-02-demo-mode-design.md
- Plan: docs/superpowers/plans/2026-11-02-demo-mode.md
- MR: none
- Ticket: none
