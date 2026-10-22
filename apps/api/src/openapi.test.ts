import { WEBHOOK_EVENTS } from "@scc/shared";
import { describe, expect, it } from "vitest";

import { API_KEY_ROUTES } from "./api-access.ts";
import { documentedOperations, openApiDocument, openApiPath } from "./openapi.ts";
import sdkPackage from "../../../packages/sdk/package.json" with { type: "json" };

interface Operation {
  operationId?: string;
  tags?: string[];
  responses: Record<string, { content?: Record<string, { schema: { $ref?: string } }> }>;
  requestBody?: { content: Record<string, { schema: { $ref?: string } }> };
}

const doc = openApiDocument();
const operations = Object.entries(doc.paths).flatMap(([path, ops]) =>
  Object.entries(ops as Record<string, Operation>).map(([method, op]) => ({
    key: `${method.toUpperCase()} ${path}`,
    op,
  })),
);

describe("openApiDocument", () => {
  it("gives every operation a unique operationId and one declared tag", () => {
    const ids = operations.map(({ op }) => op.operationId);
    const declared = new Set<string>(doc.tags.map((t) => t.name));

    const untagged = operations.filter(
      ({ op }) => op.tags?.length !== 1 || !declared.has(op.tags[0] ?? ""),
    );

    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(untagged.map(({ key }) => key)).toEqual([]);
  });

  it("documents only routes an API key can call, so no entry is silently dropped", () => {
    const routes = new Set(API_KEY_ROUTES.map((r) => `${r.method} ${openApiPath(r.route)}`));

    expect(documentedOperations().filter((key) => !routes.has(key))).toEqual([]);
  });

  it("references named schemas that all exist, with no JSON Schema ids left in", () => {
    const text = JSON.stringify(doc);
    const refs = [...text.matchAll(/"\$ref":"#\/components\/schemas\/(\w+)"/g)].map(
      (m) => m[1] ?? "",
    );

    expect(refs.length).toBeGreaterThan(0);
    expect(refs.filter((r) => !(r in doc.components.schemas))).toEqual([]);
    expect(text).not.toMatch(/"\$(id|schema|defs)"/);
  });

  it("uses each route's real success status", () => {
    const status = (key: string) =>
      Object.keys(operations.find((o) => o.key === key)?.op.responses ?? {})[0];

    expect(status("GET /api/calls")).toBe("200");
    expect(status("POST /api/uploads/transcripts")).toBe("201");
    expect(status("POST /api/calls/{id}/retry")).toBe("202");
    expect(status("DELETE /api/webhooks/{id}")).toBe("204");
  });

  it("describes every webhook event with its envelope and signature headers", () => {
    const hooks = doc.webhooks as Record<string, { post: { parameters: { name: string }[] } }>;

    expect(Object.keys(hooks).sort()).toEqual([...WEBHOOK_EVENTS, "ping"].sort());
    expect(
      new Set(Object.values(hooks).map((h) => h.post.parameters.map((p) => p.name).join())),
    ).toEqual(new Set(["Latte-Signature,Latte-Event,Latte-Delivery"]));
    expect(doc.components.schemas.CallScoredEvent).toMatchObject({
      properties: {
        type: { const: "call.scored" },
        data: { $ref: "#/components/schemas/CallScoredData" },
      },
    });
  });

  it("follows the SDK version", () => {
    expect(doc.info.version).toBe(sdkPackage.version);
  });
});
