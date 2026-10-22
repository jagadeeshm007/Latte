import { describe, expect, it } from "vitest";

import { apiReference, typeOf } from "./api-reference.ts";
import { openApiDocument } from "./openapi.ts";

const page = apiReference(openApiDocument());

describe("typeOf", () => {
  it("links a named schema to its heading", () => {
    expect(typeOf({ $ref: "#/components/schemas/CallSummary" })).toBe(
      "[CallSummary](#callsummary)",
    );
  });

  it("spells out nullable, array, enum and const types", () => {
    expect(typeOf({ type: ["number", "null"] })).toBe("number or null");
    expect(typeOf({ type: "array", items: { type: "string", format: "uuid" } })).toBe(
      "array of string (uuid)",
    );
    expect(typeOf({ enum: ["daily", "weekly"] })).toBe('`"daily"` or `"weekly"`');
    expect(typeOf({ const: "ping" })).toBe('`"ping"`');
    expect(typeOf({ anyOf: [{ type: "string" }, { type: "null" }] })).toBe("string or null");
    expect(typeOf({})).toBe("any");
  });
});

describe("apiReference", () => {
  it("has a section for every operation, webhook event and schema", () => {
    const doc = openApiDocument();
    const ids = Object.values(doc.paths).flatMap((ops) =>
      Object.values(ops as Record<string, { operationId: string }>).map((op) => op.operationId),
    );
    const headings = new Set([...page.matchAll(/^### (.+)$/gm)].map((m) => m[1]));

    const missing = [
      ...ids,
      ...Object.keys(doc.webhooks),
      ...Object.keys(doc.components.schemas),
    ].filter((name) => !headings.has(name));

    expect(missing).toEqual([]);
  });

  it("links only to schemas the page defines", () => {
    const headings = new Set(
      [...page.matchAll(/^### (.+)$/gm)].map((m) => (m[1] ?? "").toLowerCase()),
    );

    const broken = [...page.matchAll(/\]\(#(\w+)\)/g)]
      .map((m) => m[1])
      .filter((a) => !headings.has(a ?? ""));

    expect(broken).toEqual([]);
  });

  it("states status codes, files and empty bodies", () => {
    expect(page).toContain("Response 201: [UploadResult](#uploadresult).");
    expect(page).toContain("Response 204: no body.");
    expect(page).toContain("Response 200: a file (`text/csv`).");
  });

  it("carries the front matter the docs site reads", () => {
    expect(page.startsWith("---\ntitle: API reference\n")).toBe(true);
  });
});
