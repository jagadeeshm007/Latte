// Builds the SDK for installing outside this repository: plain ES modules and
// declarations in dist/, from src/ by tsc, with no bundler and no runtime
// dependency. Fails if dist/ grows past the size budget, so the SDK stays small.
import { execFileSync } from "node:child_process";
import { copyFileSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const sdkDir = path.resolve(import.meta.dirname, "..");
const dist = path.join(sdkDir, "dist");
/** The JavaScript a client loads, before gzip. */
const BUDGET_BYTES = 20 * 1024;

rmSync(dist, { recursive: true, force: true });
execFileSync("node", [path.join(sdkDir, "scripts/gen-types.ts"), "--check"], { stdio: "inherit" });
// Declarations keep their doc comments, where editors show them; the
// JavaScript drops them, since nothing reads comments at run time.
const tsc = (...args: string[]) => {
  execFileSync("pnpm", ["exec", "tsc", "-p", "tsconfig.build.json", ...args], {
    cwd: sdkDir,
    stdio: "inherit",
  });
};
tsc("--emitDeclarationOnly");
tsc("--declaration", "false", "--removeComments");
copyFileSync(path.join(sdkDir, "../../LICENSE"), path.join(sdkDir, "LICENSE"));

const js = readdirSync(dist)
  .filter((f) => f.endsWith(".js"))
  .reduce((sum, f) => sum + statSync(path.join(dist, f)).size, 0);
process.stdout.write(
  `sdk build: dist/ has ${String(Math.round(js / 102.4) / 10)} kB of JavaScript\n`,
);
if (js > BUDGET_BYTES) {
  process.stderr.write(`sdk build: over the ${String(BUDGET_BYTES / 1024)} kB budget\n`);
  process.exit(1);
}
