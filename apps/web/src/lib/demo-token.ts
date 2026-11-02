// The demo session's token (ADR-0033), kept in sessionStorage so closing the
// tab ends the demo. A tiny store: the session and the API client read it,
// and listeners hear when a demo starts or ends.

const KEY = "latte.demo";

interface Stored {
  token: string;
  expiresAt: string;
}

const listeners = new Set<() => void>();

function read(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (typeof parsed.token !== "string" || typeof parsed.expiresAt !== "string") return null;
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

/** demoToken is the demo's bearer token while it lasts, else null. */
export function demoToken(): string | null {
  const stored = read();
  if (!stored) return null;
  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    forgetDemo();
    return null;
  }
  return stored.token;
}

export function rememberDemo(session: Stored): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Storage blocked: the demo cannot outlive this page, which is all it needs.
  }
  for (const listener of listeners) listener();
}

export function forgetDemo(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
  for (const listener of listeners) listener();
}

/** onDemoChange calls listener when a demo starts or ends; returns the unsubscribe. */
export function onDemoChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
