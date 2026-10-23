// Writes the public docs into public/ before Vite runs (see src/lib/docs-build.ts):
// public/docs/<page>.md, public/docs/pages.json, public/legal/ likewise, public/llms.txt,
// public/llms-full.txt and public/openapi.json. The outputs are git-ignored;
// docs/public is the source.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { llmsFull, llmsTxt, parsePage, sortPages, summaries } from "../src/lib/docs-build.ts";

const source = path.resolve(import.meta.dirname, "../../../docs/public");
const publicDir = path.resolve(import.meta.dirname, "../public");

/** Every page in a folder of docs/public, in order. */
const pagesIn = (dir: string) =>
  sortPages(
    readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => parsePage(f.slice(0, -3), readFileSync(path.join(dir, f), "utf8"))),
  );

/** Writes each page's Markdown and the page list into public/<folder>. */
function publish(pages: ReturnType<typeof pagesIn>, folder: string) {
  const dir = path.join(publicDir, folder);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const p of pages) writeFileSync(path.join(dir, `${p.slug}.md`), p.body);
  writeFileSync(path.join(dir, "pages.json"), JSON.stringify(summaries(pages)));
}

const pages = pagesIn(source);
const legal = pagesIn(path.join(source, "legal"));
publish(pages, "docs");
publish(legal, "legal");
writeFileSync(path.join(publicDir, "llms.txt"), llmsTxt(pages));
writeFileSync(path.join(publicDir, "llms-full.txt"), llmsFull(pages));
copyFileSync(path.join(source, "openapi.json"), path.join(publicDir, "openapi.json"));
process.stdout.write(
  `build-docs: ${String(pages.length)} docs and ${String(legal.length)} legal pages, llms.txt, llms-full.txt, openapi.json\n`,
);
