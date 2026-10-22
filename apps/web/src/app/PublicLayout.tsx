import { Link, Outlet } from "@tanstack/react-router";
import { CoffeeIcon } from "lucide-react";
import { Suspense } from "react";

import { Loading } from "@/components/states";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

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
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-brand-foreground [&_svg]:size-4">
              <CoffeeIcon aria-hidden="true" />
            </span>
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
            <Button size="sm" render={<Link to="/" />}>
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
    </div>
  );
}
