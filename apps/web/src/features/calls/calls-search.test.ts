import { describe, expect, it } from "vitest";

import { summary } from "@/test/fixtures";

import { applyLocally, callsSearchSchema, groupOf, hasFilters, toFilters } from "./calls-search";

const calls = [
  summary({ id: "1", agentName: "Ravi Kumar", language: "en-IN", flag: "flagged" }),
  summary({ id: "2", agentName: "Anita Sharma", language: "hi-IN", flag: "passed" }),
  summary({
    id: "3",
    agentName: "Ravi Kumar",
    language: "hi-IN",
    status: "scoring",
    flag: "pending",
  }),
];

describe("calls search state", () => {
  it("drops only the bad value from a pasted link", () => {
    const parsed = callsSearchSchema.parse({ flag: "nonsense", language: "hi-IN", page: -3 });

    expect(parsed).toEqual({ flag: undefined, language: "hi-IN", page: undefined });
  });

  it("knows when anything narrows the list, ignoring grouping and the page", () => {
    expect(hasFilters({ groupBy: "agent", page: 3 })).toBe(false);
    expect(hasFilters({ q: "", status: "failed" })).toBe(true);
  });

  it("asks the API for page one of twenty by default", () => {
    expect(toFilters({ q: "ravi" })).toMatchObject({ q: "ravi", page: 1, limit: 20 });
  });

  it("names the group of a call for every grouping", () => {
    const c = calls[2]!;

    expect(
      (["agent", "team", "product", "language", "status", "flag"] as const).map((by) =>
        groupOf(c, by),
      ),
    ).toEqual(["Ravi Kumar", "Mumbai Inbound", "Suraksha ULIP", "Hindi", "Scoring", "Pending"]);
  });
});

describe("applyLocally (the review queue)", () => {
  it("searches and filters like the API", () => {
    expect(applyLocally(calls, { q: "anita" }).items.map((c) => c.id)).toEqual(["2"]);
    expect(
      applyLocally(calls, { language: "hi-IN", flag: "pending" }).items.map((c) => c.id),
    ).toEqual(["3"]);
    expect(applyLocally(calls, { status: "scoring", agentId: "a1" }).total).toBe(1);
  });

  it("groups while keeping the queue's order inside each group, then pages", () => {
    const grouped = applyLocally(calls, { groupBy: "agent" });
    const page2 = applyLocally(
      Array.from({ length: 25 }, () => calls[0]!),
      { page: 2 },
    );

    expect(grouped.items.map((c) => c.id)).toEqual(["2", "1", "3"]);
    expect(page2).toMatchObject({ total: 25 });
    expect(page2.items).toHaveLength(5);
  });
});
