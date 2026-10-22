import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { WEBHOOK_EVENTS, webhookEnvelopeSchema, type WebhookEvent } from "@scc/shared";
import { describe, expect, it } from "vitest";

// The hand-written pages in docs/public are checked against the code they
// describe, so an example payload or a link cannot go stale silently.

const dir = path.resolve(import.meta.dirname, "../../../docs/public");
const pages = readdirSync(dir).filter((f) => f.endsWith(".md"));
const read = (name: string) => readFileSync(path.join(dir, name), "utf8");

describe("docs/public", () => {
  it("gives every page a title, description, section and order", () => {
    const missing = pages.filter(
      (name) =>
        !/^---\ntitle: .+\ndescription: .+\nsection: .+\norder: \d+\n---\n/.test(read(name)),
    );

    expect(pages.length).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });

  it("links only to pages that exist", () => {
    const links = pages.flatMap((name) =>
      [...read(name).matchAll(/\]\(([\w-]+)\.md(?:#[\w-]+)?\)/g)].map(
        (m) => `${name} -> ${m[1] ?? ""}.md`,
      ),
    );

    const broken = links.filter((link) => !pages.includes(link.split(" -> ")[1] ?? ""));

    expect(links.length).toBeGreaterThan(0);
    expect(broken).toEqual([]);
  });

  it("shows a webhook example that the API's own schema accepts, for every event", () => {
    const page = read("webhooks.md");
    const examples = new Map(
      [...page.matchAll(/^### ([\w.]+)\n\n```json\n([\s\S]*?)```/gm)].map((m) => [
        m[1],
        m[2] ?? "",
      ]),
    );
    const events: WebhookEvent[] = [...WEBHOOK_EVENTS, "ping"];

    const failing = events.filter((event) => {
      const json = examples.get(event);
      return (
        json === undefined || !webhookEnvelopeSchema(event).safeParse(JSON.parse(json)).success
      );
    });

    expect(failing).toEqual([]);
  });
});
