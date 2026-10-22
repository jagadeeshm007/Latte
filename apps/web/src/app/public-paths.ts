/** The old in-app docs address; it only redirects to /docs, so it needs no sign-in either. */
const OLD_DOCS = "/developers/docs";

/** isPublicPath: pages anyone may open without signing in (the status page and the docs). */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/status" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/") ||
    pathname === OLD_DOCS
  );
}
