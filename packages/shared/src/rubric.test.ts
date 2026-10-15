import { describe, expect, it } from "vitest";

import { judgeJsonSchema, statusFits } from "./judge.ts";
import { DEFAULT_RUBRIC, rubricItemsSchema } from "./rubric.ts";

describe("default rubric", () => {
  it("holds the five mandatory, three prohibited and one quality item the spec names", () => {
    const byType = (t: string) => DEFAULT_RUBRIC.filter((i) => i.type === t).map((i) => i.key);
    expect(byType("mandatory")).toEqual([
      "greeting",
      "identity_check",
      "disclosure",
      "consent",
      "cooling_off",
    ]);
    expect(byType("prohibited")).toEqual([
      "guaranteed_returns",
      "false_urgency",
      "misrepresentation",
    ]);
    expect(byType("quality")).toEqual(["need_discovery"]);
    expect(rubricItemsSchema.safeParse(DEFAULT_RUBRIC).success).toBe(true);
  });

  it("rejects duplicate keys", () => {
    const first = DEFAULT_RUBRIC[0]!;
    expect(rubricItemsSchema.safeParse([first, first]).success).toBe(false);
  });
});

describe("statusFits", () => {
  it("allows breach only for prohibited items and met only for the others", () => {
    expect(statusFits({ type: "prohibited" }, "breach")).toBe(true);
    expect(statusFits({ type: "prohibited" }, "met")).toBe(false);
    expect(statusFits({ type: "mandatory" }, "missed")).toBe(true);
    expect(statusFits({ type: "mandatory" }, "breach")).toBe(false);
  });
});

describe("judgeJsonSchema", () => {
  it("is closed, requires every field and enumerates the rubric keys", () => {
    const schema = judgeJsonSchema(DEFAULT_RUBRIC) as {
      additionalProperties: boolean;
      properties: {
        items: { minItems: number; items: { properties: { key: { enum: string[] } } } };
      };
    };
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.items.minItems).toBe(DEFAULT_RUBRIC.length);
    expect(schema.properties.items.items.properties.key.enum).toContain("guaranteed_returns");
  });
});
