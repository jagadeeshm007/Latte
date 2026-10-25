// Why someone arrived from an emailed Supabase link: a manager's invite or a
// password reset (SCC-7-1). Supabase puts `type=invite` or `type=recovery` in
// the URL it redirects to, and supabase-js clears the URL once it has read
// the session, so this is read once, before the client is created, and kept
// in sessionStorage so a refresh before the password is set still asks for it.

export type PasswordNeeded = "invite" | "recovery";

const KEY = "latte.passwordNeeded";

/** arrivalReason reads the link type from a URL's hash or query; anything else is null. */
export function arrivalReason(url: { hash: string; search: string }): PasswordNeeded | null {
  for (const part of [url.hash.replace(/^#/, ""), url.search.replace(/^\?/, "")]) {
    const type = new URLSearchParams(part).get("type");
    if (type === "invite" || type === "recovery") return type;
  }
  return null;
}

/** rememberArrival keeps the reason for this tab; storage can be unavailable (private mode), which only loses the reminder. */
export function rememberArrival(reason: PasswordNeeded): void {
  try {
    sessionStorage.setItem(KEY, reason);
  } catch {
    // No storage: the screen still shows for this page load.
  }
}

export function rememberedArrival(): PasswordNeeded | null {
  try {
    const value = sessionStorage.getItem(KEY);
    return value === "invite" || value === "recovery" ? value : null;
  } catch {
    return null;
  }
}

export function forgetArrival(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing was stored.
  }
}

/** captureArrival records the reason in the current URL, if there is one. */
export function captureArrival(url: { hash: string; search: string }): void {
  const reason = arrivalReason(url);
  if (reason) rememberArrival(reason);
}
