import type { RequestHandler } from "express";

import { UnauthorizedError } from "../errors.ts";
import type { DemoContext } from "./context.ts";
import { DEMO_TOKEN_PREFIX, verifyDemoToken } from "./keys.ts";
import { liveVisitor } from "./visitors.ts";
import { getProfile } from "../repo/reference.ts";

// Signing in with a demo token (ADR-0033). It runs before authenticate: a
// demo token never reaches the Supabase verifier, and with demo mode off it
// is refused outright.

/** isDemoRequest says whether the bearer token is a demo token. */
export function isDemoRequest(authorization: string | undefined): boolean {
  return (
    /^Bearer\s+/i.test(authorization ?? "") &&
    (authorization ?? "").replace(/^Bearer\s+/i, "").startsWith(DEMO_TOKEN_PREFIX)
  );
}

/**
 * demoAuthenticate signs a demo token in as its visitor's profile, read from
 * the demo schema, and marks the request with req.demo. Other requests pass
 * through untouched.
 */
export function demoAuthenticate(demo: DemoContext | undefined): RequestHandler {
  return async (req, _res, next) => {
    if (!isDemoRequest(req.headers.authorization)) {
      next();
      return;
    }
    if (!demo) throw new UnauthorizedError("the demo is not available");
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    const visitorId = await verifyDemoToken(demo.keys, token);
    const [visitor, profile] = await Promise.all([
      liveVisitor(demo.pool, visitorId),
      getProfile(demo.pool, visitorId),
    ]);
    if (!visitor || !profile) {
      throw new UnauthorizedError("this demo session has ended; start the demo again");
    }
    req.user = profile;
    req.demo = { visitorId, fingerprint: visitor.fingerprint };
    next();
  };
}
