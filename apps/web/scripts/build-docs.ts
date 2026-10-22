// Writes the public docs into public/ before Vite runs (see src/lib/docs-build.ts):
// public/docs/<page>.md, public/docs/pages.json, public/llms.txt,
// public/llms-full.txt and public/openapi.json. The outputs are git-ignored;
// docs/public is the source.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { llmsFull, llmsTxt, parsePage, sortPages, summaries } from "../src/lib/docs-build.ts";

const source = path.resolve(import.meta.dirname, "../../../docs/public");
const publicDir = path.resolve(import.meta.dirname, "../public");
const out = path.join(publicDir, "docs");

const pages = sortPages(
  readdirSync(source)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parsePage(f.slice(0, -3), readFileSync(path.join(source, f), "utf8"))),
);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const p of pages) writeFileSync(path.join(out, `${p.slug}.md`), p.body);
writeFileSync(path.join(out, "pages.json"), JSON.stringify(summaries(pages)));
writeFileSync(path.join(publicDir, "llms.txt"), llmsTxt(pages));
writeFileSync(path.join(publicDir, "llms-full.txt"), llmsFull(pages));
copyFileSync(path.join(source, "openapi.json"), path.join(publicDir, "openapi.json"));
process.stdout.write(
  `build-docs: ${String(pages.length)} pages, llms.txt, llms-full.txt, openapi.json\n`,
);
