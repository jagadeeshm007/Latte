// Writes evals/calls/<id>.json from scripts.ts so each script and its labels
// can be read and reviewed on its own. Run: pnpm --filter @scc/evals build-calls
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { scriptTranscript } from "./eval.ts";
import { REGIONAL } from "./regional.ts";
import { CALLS } from "./scripts.ts";

const dir = path.resolve(import.meta.dirname, "..", "calls");
mkdirSync(dir, { recursive: true });
// The regional calls are seed data only; the eval gate reads CALLS.
const ALL = [...CALLS, ...REGIONAL];
for (const call of ALL) {
  const { planted } = scriptTranscript(call);
  writeFileSync(
    path.join(dir, `${call.id}.json`),
    `${JSON.stringify({ ...call, planted: planted.map((p) => p.key) }, null, 2)}\n`,
  );
}
process.stdout.write(`build-calls: ${String(ALL.length)} calls written to evals/calls\n`);
