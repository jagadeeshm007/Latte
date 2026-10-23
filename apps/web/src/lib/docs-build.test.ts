import { describe, expect, it } from "vitest";

import { llmsFull, llmsTxt, parsePage, sections, sortPages, summaries } from "./docs-build";

const page = (slug: string, section: string, order: number, body = `# ${slug}\n`) =>
  parsePage(
    slug,
    `---\ntitle: ${slug} title\ndescription: About ${slug}.\nsection: ${section}\norder: ${String(order)}\n---\n\n${body}`,
  );

describe("parsePage", () => {
  it("reads the front matter and keeps the body without it", () => {
    expect(page("quickstart", "Get started", 2, "# Quickstart\n\nHello.\n")).toEqual({
      slug: "quickstart",
      title: "quickstart title",
      description: "About quickstart.",
      section: "Get started",
      order: 2,
      body: "# Quickstart\n\nHello.\n",
    });
  });

  it("keeps a colon inside a value", () => {
    expect(
      parsePage("x", "---\ntitle: A: B\ndescription: d\nsection: s\norder: 1\n---\nbody").title,
    ).toBe("A: B");
  });

  it("refuses a page with no front matter, a missing field or a bad order", () => {
    expect(() => parsePage("a", "# A")).toThrow("docs/public/a.md has no front matter");
    expect(() => parsePage("b", "---\ntitle: B\nsection: s\norder: 1\n---\n")).toThrow(
      'needs "description"',
    );
    expect(() =>
      parsePage("c", "---\ntitle: C\ndescription: d\nsection: s\norder: two\n---\n"),
    ).toThrow("order must be a number");
  });
});

describe("sortPages and sections", () => {
  it("orders sections by their first page, then pages within them", () => {
    const sorted = sortPages([
      page("reference", "Reference", 90),
      page("webhooks", "Guides", 24),
      page("index", "Get started", 1),
      page("uploads", "Guides", 20),
    ]);

    expect(sorted.map((p) => p.slug)).toEqual(["index", "uploads", "webhooks", "reference"]);
    expect(sections(sorted).map(([name, group]) => [name, group.length])).toEqual([
      ["Get started", 1],
      ["Guides", 2],
      ["Reference", 1],
    ]);
  });

  it("drops the body from the sidebar summaries", () => {
    expect(summaries([page("index", "Get started", 1)])[0]).not.toHaveProperty("body");
  });
});

describe("llms.txt and llms-full.txt", () => {
  const pages = sortPages([
    page("index", "Get started", 1, "# Overview\n\nSee [Webhooks](webhooks.md#headers).\n"),
    page("webhooks", "Guides", 24, "# Webhooks\n"),
  ]);

  it("lists every page as a raw Markdown link under its section", () => {
    const text = llmsTxt(pages);

    expect(text.startsWith("# Latte\n\n> ")).toBe(true);
    expect(text).toContain("## Get started\n\n- [index title](/docs/index.md): About index.\n");
    expect(text).toContain("## Guides\n\n- [webhooks title](/docs/webhooks.md): About webhooks.\n");
    expect(text).toContain("- [All pages in one file](/llms-full.txt)");
  });

  it("puts every page in one file with links that work from anywhere", () => {
    const text = llmsFull(pages);

    expect(text).toContain("<!-- /docs/index.md -->\n\n# Overview");
    expect(text).toContain("[Webhooks](/docs/webhooks.md#headers)");
    expect(text).toContain("\n---\n\n<!-- /docs/webhooks.md -->");
  });
});
