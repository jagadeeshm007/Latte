// Receive Latte webhooks: check the signature, drop redeliveries, answer at
// once, then handle the event.
//
//   LATTE_WEBHOOK_SECRET=whsec_... PORT=3000 pnpm --filter @scc/examples webhook-receiver
//
// Register https://<your host>/latte-webhook under Developers > Webhooks.
// Latte retries anything but a 2xx answered within 10 seconds, so the
// handler runs after the answer; a slow CRM call cannot cause a retry.
import type { Server } from "node:http";
import process from "node:process";

import { verifyWebhookSignature } from "@latte/sdk";
import express, { text, type Express } from "express";

/** The envelope every delivery carries; data depends on type (see /docs/webhooks). */
export interface LatteEvent {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface ReceiverOptions {
  secret: string;
  onEvent: (event: LatteEvent) => Promise<void> | void;
  /** Delivery ids already handled. In-memory here; use your database when you run more than one process. */
  seen?: Set<string>;
  onError?: (error: unknown, event: LatteEvent) => void;
}

/** createReceiver: an Express app with POST /latte-webhook. */
export function createReceiver(opts: ReceiverOptions): Express {
  const seen = opts.seen ?? new Set<string>();
  const app = express();
  // The signature covers the raw body, so read it as text, not parsed JSON.
  app.post("/latte-webhook", text({ type: "application/json" }), async (req, res) => {
    const body = typeof req.body === "string" ? req.body : "";
    const valid = await verifyWebhookSignature({
      secret: opts.secret,
      header: req.header("Latte-Signature"),
      body,
    });
    if (!valid) {
      res.status(400).send("bad signature");
      return;
    }
    const delivery = req.header("Latte-Delivery") ?? "";
    if (seen.has(delivery)) {
      res.status(204).end();
      return;
    }
    seen.add(delivery);
    const event = JSON.parse(body) as LatteEvent;
    res.status(204).end();
    try {
      await opts.onEvent(event);
    } catch (error) {
      (
        opts.onError ??
        ((e) => process.stderr.write(`handling ${event.type} failed: ${String(e)}\n`))
      )(error, event);
    }
  });
  return app;
}

/** describe: one line per event, the kind of thing you would post to chat or a CRM. */
export function describe(event: LatteEvent): string {
  const d = event.data;
  switch (event.type) {
    case "call.scored":
      return `call ${String(d.callId)} scored ${String(d.overallScore)}; ${d.needsReview ? "needs QA review" : "passed"}; ${String(d.breaches)} breaches`;
    case "call.failed":
      return `call ${String(d.callId)} failed: ${String(d.reason)}`;
    case "batch.completed":
      return `batch "${String(d.name)}" done: ${String(d.scored)} scored, ${String(d.failed)} failed of ${String(d.total)}`;
    case "alert.triggered":
      return `alert "${String(d.ruleName)}" for ${String(d.groupName)}: ${String(d.value)} against ${String(d.baseline)}`;
    case "digest.ready":
      return `${String(d.frequency)} digest for ${String(d.from)} to ${String(d.to)} is ready`;
    default:
      return `${event.type} received`;
  }
}

/** main: starts the receiver on PORT with LATTE_WEBHOOK_SECRET, printing each event. */
export function main(env: NodeJS.ProcessEnv = process.env): Server {
  const secret = env.LATTE_WEBHOOK_SECRET;
  if (!secret) throw new Error("set LATTE_WEBHOOK_SECRET to the endpoint's whsec_ secret");
  const port = Number(env.PORT ?? 3000);
  const app = createReceiver({
    secret,
    onEvent: (event) => {
      process.stdout.write(`${describe(event)}\n`);
    },
  });
  return app.listen(port, () => {
    process.stdout.write(`listening on :${String(port)}/latte-webhook\n`);
  });
}

if (import.meta.main) main();
