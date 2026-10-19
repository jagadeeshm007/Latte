import { createClient } from "@supabase/supabase-js";

import type { Config } from "./config.ts";
import { ConflictError } from "./errors.ts";

// Supabase Auth's admin side (ADR-0024): inviting people. Sign-in itself,
// with a password, Google, Microsoft or SAML, stays between the browser and
// Supabase; the API only decides who has a profile and is not turned off.

export interface AuthAdmin {
  /** invite emails a sign-up link and returns the new user's id. */
  invite(email: string, displayName: string, redirectTo: string): Promise<{ id: string }>;
}

export function createAuthAdmin(
  config: Pick<Config, "SUPABASE_URL" | "SUPABASE_SECRET_KEY">,
): AuthAdmin {
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async invite(email, displayName, redirectTo) {
      const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
        data: { display_name: displayName },
        redirectTo,
      });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          throw new ConflictError("someone with this email already has an account");
        }
        throw new Error(`invite ${email}: ${error.message}`);
      }
      return { id: data.user.id };
    },
  };
}
