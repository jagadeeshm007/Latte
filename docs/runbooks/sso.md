# Runbook: single sign-on

Owner: engineering. Covers ADR-0024. Latte is invite-only: a person must be
invited from the Members page before any sign-in method gives them a role.

## Passwords

An invite link signs the person in and asks them to choose a password before
anything else, so they can sign in again by email. "Forgot password?" on the
sign-in page emails a reset link that opens "Choose a new password". Both
links come back to the site, so the production URL must be in Supabase >
Authentication > URL Configuration (site URL, and `/sign-in` under redirect
URLs). Someone who only signs in with Google, Microsoft or SAML never needs
a password.

## Google or Microsoft (OIDC)

Google is the sign-in `.env.example` turns on; Microsoft is set up the same way.

1. Google Cloud console > APIs and services > Credentials: create an OAuth
   client of type "Web application". Under authorised redirect URIs, add the
   callback URL Supabase shows on its Google provider page
   (`https://<ref>.supabase.co/auth/v1/callback`). For Microsoft, register an
   app in Entra with the same callback.
2. Supabase > Authentication > Providers: enable Google (or Azure) with that
   client id and secret.
3. Add `google` (or `azure`) to `VITE_AUTH_PROVIDERS` and redeploy;
   `make setup-deploy` copies it from `.env` to Vercel.
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
