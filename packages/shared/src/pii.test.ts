import { describe, expect, it } from "vitest";

import { findPii, luhn, redactText, redactWords, verhoeff } from "./pii.ts";

describe("PII check digits", () => {
  it("accepts real check digits and refuses one digit off", () => {
    expect([luhn("4111111111111111"), luhn("4111111111111112")]).toEqual([true, false]);
    expect([verhoeff("234123412346"), verhoeff("234123412347")]).toEqual([true, false]);
  });
});

describe("findPii and redactText", () => {
  it("masks a card said in groups, keeping its last four digits", () => {
    expect(redactText("my card is 4111 1111 1111 1111, expiry next year")).toBe(
      "my card is [card ••••1111], expiry next year",
    );
  });

  it("masks Aadhaar, mobile numbers, PAN, IFSC and email", () => {
    const text =
      "Aadhaar 2341 2341 2346, mobile +91 98765 43210, PAN abcde1234f, IFSC HDFC0001234, mail asha@example.com";

    expect(findPii(text).map((s) => s.kind)).toEqual(["aadhaar", "phone", "pan", "ifsc", "email"]);
    expect(redactText(text)).toBe(
      "Aadhaar [Aadhaar ••••2346], mobile [phone ••••3210], PAN [PAN], IFSC [IFSC], mail [email]",
    );
  });

  it("leaves amounts, dates and short numbers alone", () => {
    const text = "Pay 50000 rupees by 2026-10-16, policy term 15 years, premium 1,20,000";

    expect(findPii(text)).toEqual([]);
  });

  it("treats a long number that is not a card or Aadhaar as an account number", () => {
    expect(redactText("account 123456789012345")).toBe("account [account ••••2345]");
  });
});

describe("redactWords", () => {
  it("masks the words of a match, first with the label, the rest with a dot", () => {
    const words = ["call", "98765", "43210", "now"].map((text, i) => ({
      text,
      startMs: i * 100,
      endMs: i * 100 + 90,
    }));

    const { words: out, count } = redactWords(words);

    expect(count).toBe(1);
    expect(out.map((w) => w.text)).toEqual(["call", "[phone ••••3210]", "•", "now"]);
    expect(out[1]!.startMs).toBe(100);
  });

  it("returns the same words when there is nothing to mask", () => {
    const words = [{ text: "hello" }];

    expect(redactWords(words)).toEqual({ words, count: 0 });
  });
});
