# Runbook: single sign-on

Owner: engineering. Covers ADR-0024. Latte is invite-only: a person must be
invited from the Members page before any sign-in method gives them a role.

## Google or Microsoft (OIDC)

1. Supabase > Authentication > Providers: enable Google or Azure (Microsoft)
   with the client id and secret from Google Cloud or Microsoft Entra. Use the
   callback URL Supabase shows.
2. Add `google` or `azure` to `VITE_AUTH_PROVIDERS` and redeploy.
3. Invite the person with the email their Google or Microsoft account uses.
   Supabase links the identity by verified email on first sign-in.

## SAML (a customer's identity provider)

SAML needs the Supabase Pro plan.

1. Get the customer's IdP metadata URL and email domain.
2. Register it with the Supabase CLI:

   ```bash
   supabase sso add --type saml --project-ref <ref> --metadata-url <url> --domains <domain>
   ```

3. Give the customer the ACS URL and entity id from `supabase sso info`.
4. Add `saml` to `VITE_AUTH_PROVIDERS` and redeploy. "Sign in with SSO" asks
   for the work email and redirects to the IdP for that domain.

## Leavers

There is no SCIM sync. Disable the person on the Members page; the next
request they make is refused. Removing them in the IdP stops new sign-ins.

## Problems

| Symptom | Cause | Action |
| --- | --- | --- |
| "This account has no role yet" | signed in without an invitation, or with another email | invite that email, or ask them to use the invited one |
| Redirect returns to the wrong site | Supabase URL configuration | add the site URL and redirect URLs |
| "No SSO provider for this domain" | the domain was not registered | `supabase sso list`, then `sso add` or `sso update --domains` |
