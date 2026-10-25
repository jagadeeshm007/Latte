import { createClient } from "@supabase/supabase-js";

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

      if (existing.email_confirmed_at) {
        // Google, Microsoft or a confirmed email proved the address is theirs:
        // keep the login and email a link to sign in.
        const link = await client.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
        });
        return link.error ? { id: existing.id, signInLinkFailed: true } : { id: existing.id };
      }

      // Nobody proved this address, so whoever made the login may not own it.
      // Replace it, so their password never reaches the invited person's role.
      const removed = await client.auth.admin.deleteUser(existing.id);
      if (removed.error) throw new Error(`invite ${email}: ${removed.error.message}`);
      const again = await sendInvite(email, displayName, redirectTo);
      if (again.error) throw new Error(`invite ${email}: ${again.error.message}`);
      return { id: again.data.user.id };
    },
  };
}
