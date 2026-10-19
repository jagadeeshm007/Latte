import { describe, expect, it } from "vitest";

import { pageViewOnly } from "./analytics";

describe("pageViewOnly", () => {
  it("drops the query string, which can hold names typed into a search", () => {
    const event = pageViewOnly({
      type: "pageview",
      url: "https://latte.example/calls?q=Ravi%20Kumar&status=failed",
    });

    expect(event).toEqual({ type: "pageview", url: "https://latte.example/calls" });
  });

  it("replaces record ids so pages group by kind", () => {
    const event = pageViewOnly({
      type: "pageview",
      url: "https://latte.example/calls/0f9c2b1e-1d4a-4c5b-9e8f-7a6b5c4d3e2f",
    });

    expect(event?.url).toBe("https://latte.example/calls/:id");
  });

  it("sends no custom events", () => {
    expect(pageViewOnly({ type: "event", url: "https://latte.example/calls" })).toBeNull();
  });
});
