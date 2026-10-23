/** The old in-app docs address; it only redirects to /docs, so it needs no sign-in either. */
const OLD_DOCS = "/developers/docs";

/** isPublicPath: pages anyone may open without signing in. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/sign-in" ||
    pathname === "/status" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/") ||
    pathname === "/legal" ||
    pathname.startsWith("/legal/") ||
    pathname === OLD_DOCS
  );
}

/**
 * safeNext: where to go after signing in. Only a path on this site counts, so
 * a crafted link cannot send someone to another site ("//evil.example" or
 * "https://..."), and the sign-in page never loops to itself.
 */
export function safeNext(next: string | undefined): string {
  if (!next?.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next === "/sign-in" || next.startsWith("/sign-in?")) return "/";
  return next;
}
