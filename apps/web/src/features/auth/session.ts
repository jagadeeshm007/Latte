import { useSyncExternalStore } from "react";

import {
  forgetArrival,
  type PasswordNeeded,
  rememberArrival,
  rememberedArrival,
} from "@/lib/arrival";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

// The Supabase session as a tiny external store, so components read it with
// useSyncExternalStore instead of mirroring it into React state.

export type SessionState =
  | { status: "loading" }
  | { status: "signed_out" }
  | {
      status: "signed_in";
      userId: string;
      email: string;
      /** Set when the person arrived from an invite or a reset link and has not chosen a password yet. */
      passwordNeeded: PasswordNeeded | null;
    };

let state: SessionState = { status: "loading" };
const listeners = new Set<() => void>();

function set(next: SessionState): void {
  state = next;
  for (const listener of listeners) listener();
}

function fromSession(
  session: { user: { id: string; email?: string | undefined } } | null,
): SessionState {
  return session
    ? {
        status: "signed_in",
        userId: session.user.id,
        email: session.user.email ?? "",
        passwordNeeded: rememberedArrival(),
      }
    : { status: "signed_out" };
}

void supabase.auth.getSession().then(({ data }) => {
  // A link that did not sign anyone in (expired, used) leaves nothing to ask for.
  if (!data.session) forgetArrival();
  set(fromSession(data.session));
});
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") rememberArrival("recovery");
  if (event === "SIGNED_OUT") {
    forgetArrival();
    queryClient.clear();
  }
  set(fromSession(session));
});

export function useSession(): SessionState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** changePassword sets a new password for the signed-in person; returns Supabase's message on failure. */
export async function changePassword(password: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return error.message;
  // The invite or reset that asked for a password is answered.
  forgetArrival();
  if (state.status === "signed_in") set({ ...state, passwordNeeded: null });
  return null;
}

/** signOutEverywhere ends every session of this account, on every device, then this one. */
export async function signOutEverywhere(): Promise<void> {
  await supabase.auth.signOut({ scope: "global" });
}

/** signInWithProvider hands the browser to Google or Microsoft, which returns it here signed in. */
export async function signInWithProvider(provider: "google" | "azure"): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  return error ? error.message : null;
}

/** signInWithSso finds the company's SAML provider from the email's domain and goes there. */
export async function signInWithSso(email: string): Promise<string | null> {
  const domain = email.trim().split("@")[1];
  if (!domain) return "Enter your work email to find your company's sign-in.";
  const { data, error } = await supabase.auth.signInWithSSO({
    domain,
    options: { redirectTo: window.location.origin },
  });
  if (error) return error.message;
  window.location.assign(data.url);
  return null;
}
