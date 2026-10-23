// Turns the Markdown in docs/public into what the web app serves: each page
// as plain Markdown under /docs, a page list for the sidebar, /llms.txt (the
// llmstxt.org index) and /llms-full.txt (every page in one file). It runs
// before Vite in `dev` and `build` (scripts/build-docs.ts), and stays free of
// TypeScript-only syntax so plain Node can run it.

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  section: string;
  order: number;
  /** The page without its front matter. */
  body: string;
}

/** What the sidebar needs: everything but the body. */
export type DocSummary = Omit<DocPage, "body">;

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n+/;

/** parsePage reads one page's front matter; a page without all four fields is an error, not a gap. */
export function parsePage(slug: string, text: string): DocPage {
  const match = FRONT_MATTER.exec(text);
  if (!match) throw new Error(`docs/public/${slug}.md has no front matter`);
  const fields = new Map(
    (match[1] ?? "").split("\n").map((line) => {
      const at = line.indexOf(":");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()] as const;
    }),
  );
  const field = (name: string) => {
    const value = fields.get(name);
    if (!value) throw new Error(`docs/public/${slug}.md needs "${name}" in its front matter`);
    return value;
  };
  const order = Number(field("order"));
  if (!Number.isInteger(order)) throw new Error(`docs/public/${slug}.md: order must be a number`);
  return {
    slug,
    title: field("title"),
    description: field("description"),
    section: field("section"),
    order,
    body: text.slice(match[0].length),
  };
}

/** sortPages orders by section (in the order of its first page), then by page. */
export function sortPages(pages: DocPage[]): DocPage[] {
  const sectionOrder = new Map<string, number>();
  for (const p of pages) {
    sectionOrder.set(p.section, Math.min(sectionOrder.get(p.section) ?? Infinity, p.order));
  }
  return [...pages].sort(
    (a, b) =>
      (sectionOrder.get(a.section) ?? 0) - (sectionOrder.get(b.section) ?? 0) || a.order - b.order,
  );
}

/** Pages grouped by section, in order. */
export function sections<T extends { section: string }>(pages: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const p of pages) groups.set(p.section, [...(groups.get(p.section) ?? []), p]);
  return [...groups];
}

export function summaries(pages: DocPage[]): DocSummary[] {
  return pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    section: p.section,
    order: p.order,
  }));
}

/** llmsTxt: the llmstxt.org index, one link per page by section. */
export function llmsTxt(pages: DocPage[]): string {
  const lines = [
    "# Latte",
    "",
    "> Latte checks recorded sales and service calls against a compliance and quality rubric. Its REST API uploads recordings or transcripts, returns scores and findings, exports results and sends signed webhooks; SDKs exist for TypeScript, Python, Go and Java.",
    "",
    "Every page below is plain Markdown. The OpenAPI 3.1 document is /openapi.json; all pages in one file are /llms-full.txt. Authenticate with `Authorization: Bearer latte_...`.",
    "",
  ];
  for (const [section, group] of sections(pages)) {
    lines.push(`## ${section}`, "");
    for (const p of group) lines.push(`- [${p.title}](/docs/${p.slug}.md): ${p.description}`);
    lines.push("");
  }
  lines.push(
    "## Optional",
    "",
    "- [All pages in one file](/llms-full.txt): every page above, for a single fetch",
    "- [OpenAPI document](/openapi.json): the machine-readable API description",
    "",
  );
  return lines.join("\n");
}

/** Links between pages point at their raw Markdown, which works from any file. */
const absoluteLinks = (body: string) =>
  body.replaceAll(/\]\(([\w-]+)\.md(#[\w-]+)?\)/g, "](/docs/$1.md$2)");

/** llmsFull: every page in order, separated and headed with its own URL. */
export function llmsFull(pages: DocPage[]): string {
  const parts = pages.map(
    (p) => `<!-- /docs/${p.slug}.md -->\n\n${absoluteLinks(p.body).trimEnd()}\n`,
  );
  return parts.join("\n---\n\n");
}
