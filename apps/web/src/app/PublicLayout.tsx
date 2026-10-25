import { Link, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";

import { LatteMark } from "@/components/LatteMark";
import { Loading } from "@/components/states";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { REPOSITORY_URL } from "@/features/landing/LandingPage";

const NAV_LINK =
  "rounded-md px-2 py-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

/** PublicLayout: the frame for pages anyone may open signed out (docs, status). */
export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 md:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md font-heading text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LatteMark className="size-7" />
            Latte
          </Link>
          <nav aria-label="Site" className="flex items-center gap-1">
            <Link to="/docs" className={NAV_LINK} activeProps={{ className: "text-foreground" }}>
              Docs
            </Link>
            <Link to="/status" className={NAV_LINK} activeProps={{ className: "text-foreground" }}>
              Status
            </Link>
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" render={<Link to="/sign-in" />}>
              Sign in
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
        <Suspense fallback={<Loading label="Loading the page" />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

const LEGAL_LINKS = [
  ["terms", "Terms"],
  ["privacy", "Privacy"],
  ["cookies", "Cookies"],
  ["subprocessors", "Subprocessors"],
  ["licenses", "Open-source licences"],
] as const;

const FOOTER_LINK =
  "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

/** SiteFooter: the docs, status and legal pages, on every public page. */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm md:flex-row md:items-center md:justify-between md:px-8">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link to="/docs" className={FOOTER_LINK}>
            Docs
          </Link>
          <Link to="/status" className={FOOTER_LINK}>
            Status
          </Link>
          {LEGAL_LINKS.map(([page, label]) => (
            <Link key={page} to="/legal/$page" params={{ page }} className={FOOTER_LINK}>
              {label}
            </Link>
          ))}
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className={FOOTER_LINK}>
            GitHub
          </a>
        </nav>
        <p className="text-muted-foreground">© 2026 Jagadeesh Mandala · MIT licence</p>
      </div>
    </footer>
  );
}
