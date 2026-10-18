// Smoke test of the built Vercel output (make vercel-smoke): loads the bundled
// function the way Vercel's Node launcher does, serves it on a local port and
// checks that it answers. Needs the local Postgres from `make db`; it never
// reaches Supabase, a model provider or anything else outside this machine.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const { fetch } = globalThis;
const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, ".vercel/output");
const secret = "smoke-test-cron-secret-0123456789abcdef";

Object.assign(process.env, {
  NODE_ENV: "production",
  LOG_LEVEL: "warn",
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/scc_test",
  SUPABASE_URL: "http://127.0.0.1:9",
  SUPABASE_SECRET_KEY: "smoke-test-not-a-key",
  CRON_SECRET: secret,
  DB_POOL_MAX: "2",
});

const failures = [];
function expect(name, ok, detail) {
  process.stdout.write(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` (${detail})`}\n`);
  if (!ok) failures.push(name);
}

const vc = JSON.parse(readFileSync(path.join(out, "functions/api.func/.vc-config.json"), "utf8"));
expect("function runs on Node 24", vc.runtime === "nodejs24.x", vc.runtime);
const config = JSON.parse(readFileSync(path.join(out, "config.json"), "utf8"));
expect(
  "every cron path is a cron route",
  config.crons.length === 5 && config.crons.every((c) => c.path.startsWith("/api/cron/")),
  JSON.stringify(config.crons),
);
expect(
  "the web app is in static",
  readFileSync(path.join(out, "static/index.html"), "utf8").includes("<div id"),
  "no index.html",
);

const handlerUrl = pathToFileURL(path.join(out, "functions/api.func", vc.handler)).href;
const { default: handler } = await import(handlerUrl);
const server = createServer(handler);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

const health = await fetch(`${base}/api/health`);
expect("GET /api/health answers 200", health.status === 200, health.status);
const ready = await fetch(`${base}/api/ready`);
expect("GET /api/ready reaches the database", ready.status === 200, ready.status);
const refused = await fetch(`${base}/api/cron/work`);
expect("a cron call without the secret is refused", refused.status === 401, refused.status);
const work = await fetch(`${base}/api/cron/work`, {
  headers: { Authorization: `Bearer ${secret}` },
});
const workBody = await work.json();
expect(
  "the work cron drains the queues",
  work.status === 200 && workBody.task === "work",
  `${work.status} ${JSON.stringify(workBody)}`,
);

server.close();
process.stdout.write(
  failures.length ? `vercel-smoke: ${failures.length} failed\n` : "vercel-smoke: passed\n",
);
process.exit(failures.length ? 1 : 0);
