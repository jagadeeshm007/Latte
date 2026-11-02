import { demoSessionRequestSchema, type DemoSession, type DemoStatus } from "@scc/shared";
import { type Request, Router } from "express";

import { NotFoundError } from "../errors.ts";
import type { DemoContext } from "./context.ts";
import { fingerprintOf, ipHashOf, signDemoToken } from "./keys.ts";
import { startVisit, uploadsLeftToday } from "./visitors.ts";

// The demo's public endpoints (ADR-0033): whether it is on, and starting a
// session. Served before the bearer check; with demo mode off, starting a
// session is 404 and the status says only that it is off.

/**
 * clientIp is the caller's address. On Vercel the platform sets
 * x-forwarded-for to the client and replaces what the client sent; locally
 * it is the socket. It is only ever hashed.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  if (first) return first;
  return req.socket.remoteAddress ?? "unknown";
}

export function demoPublicRouter(demo: DemoContext | undefined): Router {
  const router = Router();

  router.get("/demo", async (_req, res) => {
    const status: DemoStatus = demo
      ? { enabled: true, uploadsLeftToday: await uploadsLeftToday(demo) }
      : { enabled: false };
    res.setHeader("Cache-Control", "no-store");
    res.json(status);
  });

  router.post("/demo/sessions", async (req, res) => {
    if (!demo) throw new NotFoundError(`route POST ${req.path} not found`);
    const signals = demoSessionRequestSchema.parse(req.body ?? {});
    const ip = clientIp(req);
    const userAgent = (req.headers["user-agent"] ?? "").slice(0, 512);
    const visit = await startVisit(
      demo,
      fingerprintOf(demo.keys, ip, userAgent, signals),
      ipHashOf(demo.keys, ip),
    );
    const session: DemoSession = {
      token: await signDemoToken(demo.keys, visit.id, visit.expiresAt),
      expiresAt: visit.expiresAt.toISOString(),
    };
    res.setHeader("Cache-Control", "no-store");
    res.status(201).json(session);
  });

  return router;
}
