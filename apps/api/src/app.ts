import { randomBytes, randomUUID } from "node:crypto";

import express, { json, Router, type Express } from "express";
import { pinoHttp } from "pino-http";

import { apiKeyGate } from "./api-access.ts";
import { authenticate } from "./auth.ts";
import { demoAllowlist } from "./demo/allowlist.ts";
import type { DemoContext } from "./demo/context.ts";
import { demoAuthenticate } from "./demo/guard.ts";
import { demoPublicRouter } from "./demo/routes.ts";
import { demoEnqueue, demoStorage } from "./demo/scoped.ts";
import { errorHandler, notFoundHandler } from "./errors.ts";
import { idempotency } from "./idempotency.ts";
import { openApiDocument } from "./openapi.ts";
import { findKeyByToken } from "./repo/api-keys.ts";
import { getProfile } from "./repo/reference.ts";
import { alertsRouter } from "./routes/alerts.ts";
import { apiKeysRouter } from "./routes/api-keys.ts";
import { batchesRouter, exportLinksRouter } from "./routes/batches.ts";
import { billingRouter } from "./routes/billing.ts";
import { callsRouter } from "./routes/calls.ts";
import { cronRouter } from "./routes/cron.ts";
import type { AppDeps } from "./routes/deps.ts";
import { inboxRouter } from "./routes/inbox.ts";
import { meRouter } from "./routes/me.ts";
import { membersRouter } from "./routes/members.ts";
import { reviewRouter } from "./routes/review.ts";
import { publicStatusRouter, statusNoticesRouter } from "./routes/status.ts";
import { teamsRouter } from "./routes/teams.ts";
import { webhooksRouter } from "./routes/webhooks.ts";

/** apiRoutes mounts every signed-in route on `router`, each built on `deps`. */
function apiRoutes(router: Router, deps: AppDeps, exportSecret: Buffer): void {
  router.use(meRouter(deps));
  router.use(callsRouter(deps));
  router.use(reviewRouter(deps));
  router.use(batchesRouter(deps, exportSecret));
  router.use(apiKeysRouter(deps));
  router.use(webhooksRouter(deps));
  router.use(inboxRouter(deps));
  router.use(alertsRouter(deps));
  router.use(teamsRouter(deps));
  router.use(membersRouter(deps));
  router.use(billingRouter(deps));
  router.use(statusNoticesRouter(deps));
}

/**
 * demoRoutes builds the signed-in routes on the demo schema: the demo pool,
 * storage under demo/, jobs tagged for the demo. Model calls and webhooks
 * run from the same deps, so they too land in demo tables.
 */
function demoRoutes(deps: AppDeps, demo: DemoContext, exportSecret: Buffer): Router {
  const demoDeps: AppDeps = {
    ...deps,
    pool: demo.pool,
    storage: demoStorage(deps.storage),
    enqueue: demoEnqueue(deps.enqueue),
  };
  const router = Router();
  router.use(demoAllowlist);
  router.use(idempotency(demo.pool));
  apiRoutes(router, demoDeps, exportSecret);
  return router;
}

/** buildApp wires middleware and routes; server.ts only starts it. */
export function buildApp(deps: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);

  app.use(
    pinoHttp({
      logger: deps.log,
      genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id =
          typeof incoming === "string" && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      // Log the route and status, never bodies or query strings that may carry names.
      serializers: {
        req: (req: { method: string; url: string }) => ({
          method: req.method,
          path: req.url.split("?")[0],
        }),
      },
    }),
  );

  // CORS for the web app's origin only; credentials travel as a bearer header, not cookies.
  app.use((req, res, next) => {
    if (req.headers.origin === deps.config.WEB_ORIGIN) {
      res.setHeader("Access-Control-Allow-Origin", deps.config.WEB_ORIGIN);
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, X-Request-Id, Idempotency-Key",
      );
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(json({ limit: "256kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/api/ready", async (_req, res) => {
    try {
      await deps.pool.query("SELECT 1");
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "database unavailable" });
    }
  });

  // The status page is public: customers check it when they cannot sign in.
  app.use("/api", publicStatusRouter(deps));

  // The API's description is public, like any API reference.
  const openApi = openApiDocument();
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApi);
  });

  // The scheduler proves itself with CRON_SECRET, not a user's token.
  if (deps.cron) app.use("/api", cronRouter(deps.config.CRON_SECRET, deps.cron));

  // Signed export links carry their own proof, so they are served before the bearer check.
  const exportSecret = deps.config.EXPORT_LINK_SECRET
    ? Buffer.from(deps.config.EXPORT_LINK_SECRET)
    : randomBytes(32);
  app.use("/api", exportLinksRouter(deps, exportSecret));

  // Public, like the status page: whether the demo is on, and starting a session (ADR-0033).
  app.use("/api", demoPublicRouter(deps.demo));

  const api = Router();
  api.use(
    authenticate(
      deps.verify,
      (id) => getProfile(deps.pool, id),
      (token) => findKeyByToken(deps.pool, token),
    ),
  );
  api.use(apiKeyGate(deps.pool));
  api.use(idempotency(deps.pool));
  apiRoutes(api, deps, exportSecret);

  // A demo visitor gets the same routes built on the demo schema, behind the
  // demo's own sign-in; nothing on that branch holds the real pool.
  const demoApi = deps.demo ? demoRoutes(deps, deps.demo, exportSecret) : null;
  app.use("/api", demoAuthenticate(deps.demo), (req, res, next) => {
    if (req.demo && demoApi) demoApi(req, res, next);
    else api(req, res, next);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
