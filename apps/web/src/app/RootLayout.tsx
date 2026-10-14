import { Link, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";

/**
 * RootLayout frames every route: header with navigation, then the outlet.
 * The Suspense boundary is where a lazy route or a useSuspenseQuery waits,
 * so the header stays put while a page loads.
 */
export function RootLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <nav aria-label="Main" className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/" className="font-semibold">
            SalesCallWeb
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Suspense
          fallback={
            <p role="status" aria-live="polite" className="text-muted-foreground">
              Loading
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
