import { createClient } from "@supabase/supabase-js";

import { captureArrival } from "@/lib/arrival";
import { env } from "@/lib/env";

// Before the client reads and clears the URL: was this an invite or a reset link?
captureArrival(window.location);

/** The browser's Supabase client: sign-in only, with the public publishable key. */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** accessToken is the signed-in user's current token, refreshed by supabase-js when it nears expiry. */
export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
