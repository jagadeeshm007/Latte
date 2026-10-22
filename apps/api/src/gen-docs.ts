// Writes the generated public docs: docs/public/openapi.json and
// docs/public/api-reference.md, from the same document /api/openapi.json
// serves. With --check it changes nothing and fails when either is stale,
// which `make typecheck` runs, so the published reference cannot drift.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import * as prettier from "prettier";

import { apiReference } from "./api-reference.ts";
import { openApiDocument } from "./openapi.ts";

const dir = path.resolve(import.meta.dirname, "../../../docs/public");
const doc = openApiDocument();

async function formatted(file: string, text: string): Promise<string> {
  return prettier.format(text, { ...(await prettier.resolveConfig(file)), filepath: file });
}

const outputs = await Promise.all(
  [
    ["openapi.json", JSON.stringify(doc)],
    ["api-reference.md", apiReference(doc)],
  ].map(async ([name = "", text = ""]) => {
    const file = path.join(dir, name);
    return { name, file, text: await formatted(file, text) };
  }),
);

const check = process.argv.includes("--check");
const stale = outputs.filter(
  ({ file, text }) => !existsSync(file) || readFileSync(file, "utf8") !== text,
);
if (check) {
  if (stale.length > 0) {
    process.stderr.write(
      `docs/public/${stale.map((s) => s.name).join(", ")} out of date: run pnpm --filter @scc/api gen:docs\n`,
    );
    process.exit(1);
  }
  process.stdout.write("gen-docs: docs/public/openapi.json and api-reference.md are current\n");
} else {
  for (const { file, text } of outputs) writeFileSync(file, text);
  process.stdout.write(`gen-docs: wrote ${outputs.map((o) => o.name).join(" and ")}\n`);
}
