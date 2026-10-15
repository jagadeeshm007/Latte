import { useSyncExternalStore } from "react";

import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

// The Supabase session as a tiny external store, so components read it with
// useSyncExternalStore instead of mirroring it into React state.

export type SessionState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; userId: string; email: string };

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
    ? { status: "signed_in", userId: session.user.id, email: session.user.email ?? "" }
    : { status: "signed_out" };
}

void supabase.auth.getSession().then(({ data }) => {
  set(fromSession(data.session));
});
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
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
