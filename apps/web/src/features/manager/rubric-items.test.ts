import { describe, expect, it } from "vitest";

import { keyFor } from "./rubric-items";

describe("keyFor", () => {
  it("makes a lower snake case key from the label", () => {
    expect(keyFor("Free look period", [])).toBe("free_look_period");
  });

  it("numbers a key that is already taken", () => {
    expect(keyFor("Greeting", ["greeting", "greeting_2"])).toBe("greeting_3");
  });

  it("starts with a letter even when the label does not", () => {
    expect(keyFor("30-day refund", [])).toBe("item_30_day_refund");
    expect(keyFor("!!!", [])).toBe("item");
  });
});
