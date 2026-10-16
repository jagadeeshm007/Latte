import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "./csv.ts";
import { signExportLink, verifyExportLink } from "./links.ts";
import { safeName } from "./zip.ts";

const secret = Buffer.alloc(32, 7);
const link = {
  batchId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  format: "zip" as const,
  include: ["audio" as const],
};
const now = Date.parse("2026-10-16T10:00:00Z");

describe("export links", () => {
  it("round-trips a link signed with the same secret before it expires", () => {
    const token = signExportLink(secret, link, now);

    expect(verifyExportLink(secret, token, now + 299_000)).toMatchObject(link);
  });

  it("refuses a link after five minutes, under another secret, or altered", () => {
    const token = signExportLink(secret, link, now);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...link, batchId: "33333333-3333-4333-8333-333333333333", exp: 2e9 }),
    ).toString("base64url");

    expect([
      verifyExportLink(secret, token, now + 301_000),
      verifyExportLink(Buffer.alloc(32, 8), token, now),
      verifyExportLink(secret, `${forged}.${sig!}`, now),
      verifyExportLink(secret, `${body!}.`, now),
      verifyExportLink(secret, "not-a-token", now),
    ]).toEqual([null, null, null, null, null]);
  });
});

describe("export files", () => {
  it("quotes CSV cells and defuses spreadsheet formulas", () => {
    expect(toCsv([["a,b", '"q"', "+1", null, 2]])).toBe('"a,b","""q""",\'+1,,2\r\n');
    expect(csvCell("@SUM(1)")).toBe("'@SUM(1)");
  });

  it("makes names safe as paths inside a ZIP", () => {
    expect([safeName("../../etc/passwd"), safeName("a:b*c?.wav"), safeName("\u0000")]).toEqual([
      "_.._etc_passwd",
      "a_b_c_.wav",
      "file",
    ]);
  });
});
