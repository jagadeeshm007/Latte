import { useSyncExternalStore } from "react";

// The colour theme: the viewer's choice, kept in localStorage, applied as the
// .dark class on <html> that the tokens in index.css key off. index.html runs
// the same rule before first paint so a dark page never flashes light.

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_KEY = "scc-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    // Storage can be blocked (private windows, site-data settings).
    return "system";
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

/** applyTheme sets or clears .dark on <html> for the given choice. */
export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Not persisted; the choice still applies for this page.
  }
  current = theme;
  applyTheme(theme);
  for (const l of listeners) l();
}

let current: Theme = readTheme();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // "system" follows the OS while the page is open.
  const mql = typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;
  const onChange = () => {
    if (current === "system") applyTheme("system");
  };
  mql?.addEventListener("change", onChange);
  return () => {
    listeners.delete(listener);
    mql?.removeEventListener("change", onChange);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => "system" as const,
  );
}
