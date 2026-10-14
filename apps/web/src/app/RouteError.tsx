import { type ErrorComponentProps, Link, useRouter } from "@tanstack/react-router";

import { ApiError } from "@/lib/api";

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
}

/**
 * RouteError is the router's errorComponent: a loader or a route component
 * threw. It stays inside the RootLayout, so the header and navigation keep
 * working, and offers a retry that re-runs the loaders.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <section role="alert" aria-labelledby="route-error-heading">
      <h1 id="route-error-heading" className="text-2xl font-semibold">
        This page could not load
      </h1>
      <p className="mt-2 text-muted-foreground">{describe(error)}</p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => {
            reset();
            void router.invalidate();
          }}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Try again
        </button>
        <Link to="/" className="inline-flex h-9 items-center underline">
          Back to the start
        </Link>
      </div>
    </section>
  );
}
