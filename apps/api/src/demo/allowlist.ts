import type { RequestHandler } from "express";

import { AppError } from "../errors.ts";

// What a demo visitor may do (ADR-0033). An allowlist: a route not named
// here, including any route added later, is refused until someone adds it.
// The visitor is a manager, so role checks still apply on top of this.

const ALLOWED: Record<string, string[]> = {
  GET: [
    "/me",
    "/reference",
    "/calls",
    "/calls/:id",
    "/review/queue",
    "/scorecard/:id",
    "/agreement",
    "/dashboard",
    "/dashboard/leaderboard",
    "/dashboard/highlights",
    "/rubrics/active",
    "/rubrics",
    "/alert-rules",
    "/alert-firings",
    "/teams",
    "/saved-views",
    "/notifications",
    "/notifications/unread-count",
    // The dashboard's model spend card: the demo schema's own ledger.
    "/usage",
    "/usage/history",
  ],
  POST: [
    "/uploads/transcripts",
    "/calls/:id/audio-url",
    "/notifications/read-all",
    "/notifications/:id/read",
  ],
};

const compile = (route: string) => new RegExp(`^${route.replace(/:\w+/g, "[^/]+")}/?$`);
const RULES = Object.fromEntries(
  Object.entries(ALLOWED).map(([method, routes]) => [method, routes.map(compile)]),
);

/** demoAllowed says whether a demo visitor may call this method and path (under /api). */
export function demoAllowed(method: string, path: string): boolean {
  return (RULES[method] ?? []).some((rule) => rule.test(path));
}

/** demoAllowlist refuses anything a demo visitor may not do with 403 demo_forbidden. */
export const demoAllowlist: RequestHandler = (req, _res, next) => {
  if (!demoAllowed(req.method, req.path)) {
    throw new AppError("Not available in the demo", 403, "demo_forbidden");
  }
  next();
};
