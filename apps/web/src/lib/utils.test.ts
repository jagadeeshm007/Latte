import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges conditional classes and lets the last Tailwind utility win", () => {
    const isHidden = false as boolean;
    expect(cn("p-2", undefined, isHidden && "hidden", "p-4", { "text-sm": true })).toBe(
      "p-4 text-sm",
    );
  });
});
