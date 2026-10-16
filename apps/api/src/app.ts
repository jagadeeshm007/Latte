import { randomBytes, randomUUID } from "node:crypto";

import express, { json, Router, type Express } from "express";
import { pinoHttp } from "pino-http";

import { apiKeyGate } from "./api-access.ts";
import { authenticate, currentUser } from "./auth.ts";
import { errorHandler, notFoundHandler } from "./errors.ts";
import { openApiDocument } from "./openapi.ts";
import { findKeyByToken } from "./repo/api-keys.ts";
import { getProfile } from "./repo/reference.ts";
import { apiKeysRouter } from "./routes/api-keys.ts";
import { batchesRouter, exportLinksRouter } from "./routes/batches.ts";
import { callsRouter } from "./routes/calls.ts";
import type { AppDeps } from "./routes/deps.ts";
import { reviewRouter } from "./routes/review.ts";

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
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-Id");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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

  // The API's description is public, like any API reference.
  const openApi = openApiDocument();
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApi);
  });

  // Signed export links carry their own proof, so they are served before the bearer check.
  const exportSecret = deps.config.EXPORT_LINK_SECRET
    ? Buffer.from(deps.config.EXPORT_LINK_SECRET)
    : randomBytes(32);
  app.use("/api", exportLinksRouter(deps, exportSecret));

  const api = Router();
  api.use(
    authenticate(
      deps.verify,
      (id) => getProfile(deps.pool, id),
      (token) => findKeyByToken(deps.pool, token),
    ),
  );
  api.use(apiKeyGate(deps.pool));
  api.get("/me", (req, res) => {
    res.json(currentUser(req));
  });
  api.use(callsRouter(deps));
  api.use(reviewRouter(deps));
  api.use(batchesRouter(deps, exportSecret));
  api.use(apiKeysRouter(deps));
  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
