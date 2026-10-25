# Progress: SCC-7 AccountAccess

- Task: SCC-7
- Title: AccountAccess
- Branch: feature/SCC-7-AccountAccess
- Status: merged
- Owner: Jagadeesh
- Started: 2026-10-24
- Updated: 2026-10-25
- Acceptance criteria: 3

## Next
- SCC-7-2 (chore/SCC-7-2-CloseOut): environments file for verify-deploy, close the progress records, set-password logo
- After deploy: sign in with an uninvited Google account (refused), invite it, sign in again (lands with the role)

## Done
- SCC-7-1-1 to SCC-7-1-3 (#29, merged): set a password after an invite, forgot password and the reset screen, Google sign-in on by default
- 2026-10-25: Google sign-in enabled in production (Google Cloud OAuth client, Supabase provider, VITE_AUTH_PROVIDERS=google, redeployed)
- SCC-7-1-4 to SCC-7-1-7 (#30, merged 2026-10-25): inviting someone who tried Google first no longer answers "already has an account"; SSO runbook completed
- Intent merged into main 2026-10-25 (#32, 9c0a407)

## Blockers
- none

## Decisions
- An invite keeps an existing login only when all its identities are Google, Microsoft or SAML; any login with a password identity is deleted and re-invited, so a stranger's sign-up never receives the role whatever Supabase "Confirm email" is set to (CSO run 1792946962923-8a8f0702020cedd7, High, fixed in SCC-7-1-6)

## Links
- MR: https://github.com/jagadeeshm007/Latte/pull/29 (merged), https://github.com/jagadeeshm007/Latte/pull/30 (merged), https://github.com/jagadeeshm007/Latte/pull/32 (merged)
- Ticket: none
