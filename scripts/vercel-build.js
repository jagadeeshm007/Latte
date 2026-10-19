// Builds the whole of Latte for Vercel in Build Output API v3 form (ADR-0020):
//   .vercel/output/static            the web app (Vite build, same-origin API)
//   .vercel/output/functions/api.func the API as one bundled Node function
//   .vercel/output/config.json       routes, SPA fallback and the cron schedule
// Run it with `make vercel-build`; Vercel runs it as the project's build command.
// VERCEL_CRON_PLAN=hobby writes daily crons only (Hobby's limit); Supabase
// pg_cron then calls the same routes every minute (make supabase-cron, ADR-0029).
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const apiDir = path.join(root, "apps/api");
const webDir = path.join(root, "apps/web");
const out = path.join(root, ".vercel/output");
const funcDir = path.join(out, "functions/api.func");

/** Must match MAX_DURATION_SECONDS in apps/api/src/vercel.ts. */
const MAX_DURATION_SECONDS = 300;
/** Next to the database (Supabase ap-south-1): every query is a round trip. */
const REGION = process.env.VERCEL_FUNCTION_REGION ?? "bom1";
/** Packages loaded at run time through createRequire, so the bundler cannot inline them. */
const RUNTIME_PACKAGES = ["wavefile"];

const SCHEDULES = {
  pro: {
    work: "* * * * *",
    status: "*/5 * * * *",
    alerts: "5 * * * *",
    digests: "10 * * * *",
    purge: "15 2 * * *",
  },
  hobby: {
    work: "0 3 * * *",
    status: "0 4 * * *",
    alerts: "5 4 * * *",
    digests: "10 4 * * *",
    purge: "15 2 * * *",
  },
};

const plan = process.env.VERCEL_CRON_PLAN ?? "pro";
if (!(plan in SCHEDULES)) {
  throw new Error(`VERCEL_CRON_PLAN must be "pro" or "hobby", not "${plan}"`);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(funcDir, { recursive: true });

// 1. The web app. An empty VITE_API_URL means the API is on the same origin.
execFileSync("pnpm", ["--filter", "@scc/web", "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL ?? "" },
});
cpSync(path.join(webDir, "dist"), path.join(out, "static"), { recursive: true });

// 2. The API, bundled with the web app's own Vite (no extra build tool), so the
// workspace's TypeScript sources and every dependency land in one ES module.
const webRequire = createRequire(path.join(webDir, "package.json"));
const { build } = await import(pathToFileURL(webRequire.resolve("vite")).href);
await build({
  root: apiDir,
  configFile: false,
  logLevel: "warn",
  build: {
    ssr: "src/vercel.ts",
    outDir: funcDir,
    emptyOutDir: false,
    target: "node24",
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: { format: "esm", entryFileNames: "index.mjs", inlineDynamicImports: true },
    },
  },
  ssr: { noExternal: true, external: RUNTIME_PACKAGES, target: "node" },
});

const apiRequire = createRequire(path.join(apiDir, "package.json"));
for (const name of RUNTIME_PACKAGES) {
  const pkgDir = realpathSync(path.dirname(apiRequire.resolve(`${name}/package.json`)));
  cpSync(pkgDir, path.join(funcDir, "node_modules", name), { recursive: true });
}
writeFileSync(path.join(funcDir, "package.json"), JSON.stringify({ type: "module" }));

// A function has no file to point DB_SSL_CA at, so the Supabase root CA can be
// given as text in DB_SSL_CA_PEM at build time; it ships beside the bundle and
// the server certificate is verified. Without it TLS is used unverified.
// Set here, not as a project variable: NODE_ENV=production there skips devDependencies at install.
const environment = { NODE_ENV: "production" };
if (process.env.DB_SSL_CA_PEM) {
  mkdirSync(path.join(funcDir, "certs"), { recursive: true });
  writeFileSync(path.join(funcDir, "certs/db-ca.crt"), process.env.DB_SSL_CA_PEM);
  environment.DB_SSL_CA = "certs/db-ca.crt";
}
writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs24.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      shouldAddSourcemapSupport: true,
      maxDuration: MAX_DURATION_SECONDS,
      regions: [REGION],
      environment,
    },
    null,
    2,
  ),
);

// 3. Routing: the API, then real files, then the single-page app for the rest.
const config = {
  version: 3,
  routes: [
    {
      src: "^/assets/(.*)$",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      continue: true,
    },
    { src: "^/api(?:/.*)?$", dest: "/api" },
    { handle: "filesystem" },
    { src: "^/(.*)$", dest: "/index.html" },
  ],
  crons: Object.entries(SCHEDULES[plan]).map(([task, schedule]) => ({
    path: `/api/cron/${task}`,
    schedule,
  })),
};
writeFileSync(path.join(out, "config.json"), JSON.stringify(config, null, 2));
process.stdout.write(`vercel-build: .vercel/output written (${plan} crons)\n`);
