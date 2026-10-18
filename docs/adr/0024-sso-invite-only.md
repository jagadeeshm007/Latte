# ADR-0024: Single sign-on, invite-only, through Supabase Auth

- Status: Accepted
- Date: 2026-10-18
- Task: SCC-1
- Deciders: engineering, with the product owner (chose invite-only)
- Area: auth
- Reversibility: easy: provider buttons follow `VITE_AUTH_PROVIDERS`; migration 0012 has a down file

## Context

Users were created by hand. Customers want to sign in with Google, Microsoft or their SAML identity provider, without anyone in their company being able to join just by signing in.

## Decision

- Managers invite people from the Members page (`auth.admin.inviteUserByEmail`), with a role and, for agents, the agent they are. The profile is created with the Supabase user id.
- The sign-in page offers Google and Microsoft (OIDC) and SAML by email domain (`signInWithSSO`) as listed in `VITE_AUTH_PROVIDERS`, next to email and password. Supabase links an SSO identity to the invited user by verified email.
- Someone who signs in without an invitation has no profile and gets "this account has no role yet".
- `profiles.disabled_at`: a disabled person is refused on the next request. The last active manager cannot be demoted or disabled. Role changes, disabling and enabling are audited.

## Consequences

SAML needs Supabase Pro and setup per customer (`docs/runbooks/sso.md`). There is no SCIM: leavers are disabled by hand.

## Commits us to

Supabase Auth as the identity broker.
