import { describe, expect, it, vi } from "vitest";

import { TRANSLATE_BATCH_CHARS, translateLines } from "./translate.ts";

// Regional lines are translated to English for the judge, several lines per
// request so a long call stays within Sarvam's rate limits.

/** A fake translator that tags each numbered line, the way the real one keeps the numbers. */
const echo = (text: string) => Promise.resolve(text.replace(/\] /g, "] EN "));

describe("translateLines", () => {
  it("translates lines in numbered batches and returns one translation per line", async () => {
    const translate = vi.fn(echo);

    const out = await translateLines(["नमस्ते सर", "यह प्लान", "ठीक है"], translate);

    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate.mock.calls[0]![0]).toBe("[1] नमस्ते सर\n[2] यह प्लान\n[3] ठीक है");
    expect(out).toEqual(["EN नमस्ते सर", "EN यह प्लान", "EN ठीक है"]);
  });

  it("starts a new batch before passing the character limit", async () => {
    const translate = vi.fn(echo);
    const long = "क".repeat(TRANSLATE_BATCH_CHARS - 20);

    const out = await translateLines([long, "दूसरा", "तीसरा"], translate);

    expect(translate).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(3);
    expect(out[2]).toBe("EN तीसरा");
  });

  it("falls back to one line per request when the numbers do not come back", async () => {
    const translate = vi
      .fn<(text: string) => Promise<string>>()
      .mockResolvedValueOnce("Hello sir, this plan is fine.")
      .mockResolvedValueOnce("Hello sir")
      .mockResolvedValueOnce("This plan is fine");

    const out = await translateLines(["नमस्ते सर", "यह प्लान ठीक है"], translate);

    expect(translate).toHaveBeenCalledTimes(3);
    expect(translate.mock.calls[1]![0]).toBe("नमस्ते सर");
    expect(out).toEqual(["Hello sir", "This plan is fine"]);
  });

  it("returns nothing for no lines", async () => {
    const translate = vi.fn(echo);

    expect(await translateLines([], translate)).toEqual([]);
    expect(translate).not.toHaveBeenCalled();
  });
});
