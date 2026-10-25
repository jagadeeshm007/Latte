import { createClient, type User } from "@supabase/supabase-js";

import type { Config } from "./config.ts";
import { ConflictError } from "./errors.ts";

// Supabase Auth's admin side (ADR-0024): inviting people. Sign-in itself,
// with a password, Google, Microsoft or SAML, stays between the browser and
// Supabase; the API only decides who has a profile and is not turned off.

export interface AuthAdmin {
  /**
   * invite emails a sign-up link and returns the user's id. When signInLinkFailed
   * is set, an existing login was taken over but its sign-in email did not go.
   */
  invite(
    email: string,
    displayName: string,
    redirectTo: string,
  ): Promise<{ id: string; signInLinkFailed?: boolean }>;
}

/**
 * provenByProvider: the login was made only through Google, Microsoft or SAML,
 * which proved the email. A password identity proves nothing when Supabase's
 * "Confirm email" is off, so a login with one is never taken over.
 */
const provenByProvider = (user: User) =>
  Boolean(user.email_confirmed_at) &&
  (user.identities ?? []).length > 0 &&
  (user.identities ?? []).every((identity) => identity.provider !== "email");

const alreadyRegistered = (error: { message: string; code?: string | undefined }) =>
  error.code === "email_exists" || /already|registered|exists/i.test(error.message);

export function createAuthAdmin(
  config: Pick<Config, "SUPABASE_URL" | "SUPABASE_SECRET_KEY">,
): AuthAdmin {
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const sendInvite = (email: string, displayName: string, redirectTo: string) =>
    client.auth.admin.inviteUserByEmail(email, {
      data: { display_name: displayName },
      redirectTo,
    });

  return {
    async invite(email, displayName, redirectTo) {
      const first = await sendInvite(email, displayName, redirectTo);
      if (!first.error) return { id: first.data.user.id };
      if (!alreadyRegistered(first.error)) {
        throw new Error(`invite ${email}: ${first.error.message}`);
      }

      // The email already has a login but no profile: usually someone who
      // tried Google before being invited. A magic link lookup returns that
      // user without sending anything.
      const found = await client.auth.admin.generateLink({ type: "magiclink", email });
      if (found.error) {
        throw new ConflictError("someone with this email already has an account");
      }
      const existing = found.data.user;

      if (provenByProvider(existing)) {
        // Their identity provider proved the address: keep the login and
        // email a link to sign in.
        const link = await client.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
        });
        return link.error ? { id: existing.id, signInLinkFailed: true } : { id: existing.id };
      }

      // A password sign-up may be a stranger's, confirmed or not. Replace the
      // login, so their password never reaches the invited person's role.
      const removed = await client.auth.admin.deleteUser(existing.id);
      if (removed.error) throw new Error(`invite ${email}: ${removed.error.message}`);
      const again = await sendInvite(email, displayName, redirectTo);
      if (again.error) throw new Error(`invite ${email}: ${again.error.message}`);
      return { id: again.data.user.id };
    },
  };
}
