import { Link } from "@tanstack/react-router";

/** NotFound answers any path the route tree does not know. */
export function NotFound() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading" className="text-2xl font-semibold">
        Page not found
      </h1>
      <p className="mt-2 text-muted-foreground">
        <Link to="/" className="underline">
          Back to the start
        </Link>
      </p>
    </section>
  );
}
