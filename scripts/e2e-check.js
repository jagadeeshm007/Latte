// End-to-end check of a running Latte (make e2e-check): signs in as the seeded
// manager, creates a one-day API key, uploads one sample call through the SDK,
// waits for it to be scored and downloads the batch CSV. It writes real data
// and makes one transcription and one scoring call (a few cents), so run it
// yourself against production. It never prints a password, token or key.
//   LATTE_URL=https://latte-delta.vercel.app make e2e-check
//   LATTE_URL=http://localhost:8000 SEED_USERS=.scratch/docker/seed-users.txt make e2e-check
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// The built SDK, the same files a user installs (make sdk-build runs first).
import { LatteClient } from "../packages/sdk/dist/index.js";

const { fetch } = globalThis;
const root = path.resolve(import.meta.dirname, "..");
const base = (process.env.LATTE_URL ?? "").replace(/\/+$/, "");
if (!base) throw new Error("set LATTE_URL, for example https://latte-delta.vercel.app");
const usersFile = path.resolve(root, process.env.SEED_USERS ?? ".scratch/seed-users.txt");
const audio = path.resolve(
  root,
  process.env.SAMPLE_CALL ?? "evals/audio/calls/01-clean-ulip-en.wav",
);
const say = (line) => process.stdout.write(`e2e-check: ${line}\n`);

const manager = readFileSync(usersFile, "utf8")
  .split("\n")
  .find((l) => l.startsWith("manager"));
if (!manager) throw new Error(`no manager line in ${usersFile}; run the seed first`);
const [, email, password] = manager.trim().split(/\s+/);

// The publishable key is public: the web bundle carries it.
const html = await (await fetch(`${base}/`)).text();
const script = /src="(\/assets\/index-[^"]+\.js)"/.exec(html)?.[1];
if (!script) throw new Error("could not find the web bundle");
const bundle = await (await fetch(base + script)).text();
const supabaseUrl =
  /https:\/\/[a-z0-9]+\.supabase\.co|http:\/\/localhost:8000/.exec(bundle)?.[0] ?? base;
const apikey = /sb_publishable_[\w-]+|eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/.exec(bundle)?.[0];
if (!apikey) throw new Error("could not find the publishable key in the web bundle");

const signIn = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!signIn.ok) throw new Error(`sign-in as ${email} failed: ${String(signIn.status)}`);
const { access_token: token } = await signIn.json();
say(`signed in as ${email}`);

const made = await fetch(`${base}/api/api-keys`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "e2e-check",
    scopes: ["calls:read", "calls:write", "batches:read", "exports:read"],
    expiresInDays: 1,
  }),
});
if (!made.ok) throw new Error(`creating an API key failed: ${String(made.status)}`);
const { secret } = await made.json();
say("created a one-day API key named e2e-check");

const latte = new LatteClient({ apiKey: secret, baseUrl: base });
const ref = await latte.reference();
const team = ref.teams[0];
const agent = ref.agents.find((a) => a.teamId === team?.id);
const product = ref.products[0];
if (!team || !agent || !product) throw new Error("no team, agent or product: run the seed first");

const upload = await latte.batches.create(
  [
    {
      data: new Uint8Array(readFileSync(audio)),
      filename: path.basename(audio),
      agentId: agent.id,
      teamId: team.id,
      productId: product.id,
      callDate: new Date().toISOString().slice(0, 10),
      language: "en-IN",
    },
  ],
  { name: "e2e-check" },
);
if (!upload.batchId || upload.failed.length > 0) {
  throw new Error(`upload failed: ${upload.failed[0]?.error ?? "no batch"}`);
}
say(
  `uploaded ${path.basename(audio)}; waiting for it to be scored (the queue runs every few minutes)`,
);

const started = Date.now();
const batch = await latte.batches.wait(upload.batchId, {
  intervalMs: 10_000,
  timeoutMs: 20 * 60_000,
});
const call = await latte.calls.get(upload.callIds[0] ?? "");
say(`batch ${batch.state} after ${String(Math.round((Date.now() - started) / 1000))}s`);
say(`call ${call.call.status}, score ${String(call.call.overallScore)}, ${call.call.flag}`);
const csv = await latte.batches.resultsCsv(upload.batchId);
say(`results CSV has ${String(csv.trim().split("\n").length - 1)} row`);
if (call.call.status !== "scored") process.exit(1);
say("passed");
