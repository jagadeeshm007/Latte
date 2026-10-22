import { describe, expect, it } from "vitest";

import {
  callListQuerySchema,
  MAX_UPLOAD_BYTES,
  saveRubricRequestSchema,
  uploadConfirmRequestSchema,
  uploadSignRequestSchema,
  batchExportQuerySchema,
  alertRuleRequestSchema,
  createApiKeyRequestSchema,
  saveViewRequestSchema,
  updateViewRequestSchema,
  createWebhookRequestSchema,
  isWebhookUrl,
  updateWebhookRequestSchema,
  updateApiKeyRequestSchema,
  batchUpdateRequestSchema,
  callSummarySchema,
  transcriptUploadRequestSchema,
} from "./api.ts";
import { DEFAULT_RUBRIC } from "./rubric.ts";

const file = { name: "call.wav", type: "audio/wav", size: 1000 };

describe("upload requests (AC-US-01-001-3)", () => {
  it("accepts 1 to 10 WAV or MP3 files up to 50 MB", () => {
    expect(
      uploadSignRequestSchema.safeParse({
        files: [file, { ...file, type: "audio/mpeg", size: MAX_UPLOAD_BYTES }],
      }).success,
    ).toBe(true);
  });

  it("refuses 51 files, a file over 50 MB and another type, with a message naming the limit", () => {
    const tooMany = uploadSignRequestSchema.safeParse({ files: Array(51).fill(file) });
    const tooBig = uploadSignRequestSchema.safeParse({
      files: [{ ...file, size: MAX_UPLOAD_BYTES + 1 }],
    });
    const wrongType = uploadSignRequestSchema.safeParse({
      files: [{ ...file, type: "video/mp4" }],
    });

    expect(tooMany.error?.issues[0]?.message).toBe("at most 50 files per upload");
    expect(tooBig.error?.issues[0]?.message).toBe("each file must be 50 MB or smaller");
    expect(wrongType.error?.issues[0]?.message).toBe("only WAV or MP3 recordings are accepted");
  });

  it("requires uuid reference ids and an ISO call date on confirm", () => {
    const base = {
      path: "u/x.wav",
      originalFilename: "x.wav",
      mimeType: "audio/wav",
      sizeBytes: 10,
      agentId: "00000000-0000-4000-8000-000000000001",
      teamId: "00000000-0000-4000-8000-000000000002",
      productId: "00000000-0000-4000-8000-000000000003",
      callDate: "2026-10-01",
    };

    expect(uploadConfirmRequestSchema.safeParse({ files: [base] }).success).toBe(true);
    expect(
      uploadConfirmRequestSchema.safeParse({ files: [{ ...base, agentId: "ravi" }] }).success,
    ).toBe(false);
    expect(
      uploadConfirmRequestSchema.safeParse({ files: [{ ...base, callDate: "01/10/2026" }] })
        .success,
    ).toBe(false);
  });
});

describe("list query", () => {
  it("defaults the page size and refuses one over 100", () => {
    expect(callListQuerySchema.parse({}).limit).toBe(50);
    expect(callListQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(callListQuerySchema.safeParse({ needsReview: "yes" }).success).toBe(false);
  });
});

describe("rubric save request", () => {
  it("needs a name and valid items", () => {
    expect(saveRubricRequestSchema.safeParse({ name: "v2", items: DEFAULT_RUBRIC }).success).toBe(
      true,
    );
    expect(saveRubricRequestSchema.safeParse({ name: "", items: DEFAULT_RUBRIC }).success).toBe(
      false,
    );
    expect(saveRubricRequestSchema.safeParse({ name: "v2", items: [] }).success).toBe(false);
  });
});

describe("batch requests (ADR-0017)", () => {
  it("reads the ZIP parts from a comma list and refuses unknown ones", () => {
    expect(batchExportQuerySchema.parse({ include: "audio,transcripts" }).include).toEqual([
      "audio",
      "transcripts",
    ]);
    expect(batchExportQuerySchema.parse({}).include).toEqual([]);
    expect(batchExportQuerySchema.safeParse({ include: "secrets" }).success).toBe(false);
  });

  it("needs something to change on a batch, and a name that is not blank", () => {
    expect(batchUpdateRequestSchema.safeParse({}).success).toBe(false);
    expect(batchUpdateRequestSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(batchUpdateRequestSchema.parse({ archived: true })).toEqual({ archived: true });
  });
});

describe("API key requests (ADR-0018)", () => {
  it("needs a scope, refuses one listed twice, and keeps limits under the ceiling", () => {
    const base = { name: "CRM", scopes: ["calls:read"] };

    expect(createApiKeyRequestSchema.parse(base)).toEqual({
      ...base,
      expiresInDays: null,
      limits: {},
    });
    expect(createApiKeyRequestSchema.safeParse({ ...base, scopes: [] }).success).toBe(false);
    expect(
      createApiKeyRequestSchema.safeParse({ ...base, scopes: ["calls:read", "calls:read"] })
        .success,
    ).toBe(false);
    expect(createApiKeyRequestSchema.safeParse({ ...base, limits: { bulk: 101 } }).success).toBe(
      false,
    );
  });

  it("needs a name or limits to change a key", () => {
    expect(updateApiKeyRequestSchema.safeParse({}).success).toBe(false);
    expect(updateApiKeyRequestSchema.parse({ limits: { read: 1200 } })).toEqual({
      limits: { read: 1200 },
    });
  });
});

describe("webhook requests (ADR-0021)", () => {
  it("takes only https on the standard port, without credentials", () => {
    expect(
      [
        "https://hooks.example.com/x",
        "https://hooks.example.com:443/x",
        "http://hooks.example.com/x",
        "https://hooks.example.com:8443/x",
        "https://user:pw@hooks.example.com/x",
        "not a url",
      ].map(isWebhookUrl),
    ).toEqual([true, true, false, false, false, false]);
  });

  it("needs an event, refuses one listed twice, and needs something to change", () => {
    const url = "https://hooks.example.com/x";

    expect(createWebhookRequestSchema.parse({ url, events: ["call.scored"] })).toEqual({
      url,
      description: "",
      events: ["call.scored"],
    });
    expect(createWebhookRequestSchema.safeParse({ url, events: [] }).success).toBe(false);
    expect(
      createWebhookRequestSchema.safeParse({ url, events: ["call.scored", "call.scored"] }).success,
    ).toBe(false);
    expect(updateWebhookRequestSchema.safeParse({}).success).toBe(false);
    expect(updateWebhookRequestSchema.parse({ enabled: false })).toEqual({ enabled: false });
  });
});

describe("saved views and alert rules (ADR-0025)", () => {
  it("keeps a view's filters flat and few", () => {
    const base = { page: "calls", name: "Mine" };
    const tooMany = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`k${String(i)}`, i]));

    expect(saveViewRequestSchema.parse({ ...base, search: { flag: "flagged" } })).toMatchObject({
      shared: false,
    });
    expect(saveViewRequestSchema.safeParse({ ...base, search: { q: { a: 1 } } }).success).toBe(
      false,
    );
    expect(saveViewRequestSchema.safeParse({ ...base, search: tooMany }).success).toBe(false);
    expect(updateViewRequestSchema.safeParse({}).success).toBe(false);
  });

  it("asks for a rubric item exactly when the metric is an item fail rate", () => {
    const base = { name: "R", scope: "team", thresholdPoints: 10 };

    expect([
      alertRuleRequestSchema.safeParse({ ...base, metric: "flag_rate" }).success,
      alertRuleRequestSchema.safeParse({ ...base, metric: "item_fail_rate" }).success,
      alertRuleRequestSchema.safeParse({ ...base, metric: "flag_rate", itemKey: "consent" })
        .success,
      alertRuleRequestSchema.safeParse({ ...base, metric: "item_fail_rate", itemKey: "consent" })
        .success,
    ]).toEqual([true, false, false, true]);
  });
});

describe("transcript uploads (ADR-0030)", () => {
  const base = {
    originalFilename: "call.txt",
    agentId: "00000000-0000-4000-8000-000000000001",
    teamId: "00000000-0000-4000-8000-000000000002",
    productId: "00000000-0000-4000-8000-000000000003",
    callDate: "2026-10-22",
  };
  const upload = (over: Record<string, unknown>) =>
    transcriptUploadRequestSchema.safeParse({ transcripts: [{ ...base, ...over }] });

  it("accepts lines all with times or all without, defaulting to English", () => {
    const timed = upload({
      lines: [{ speaker: "agent", text: "Hi", startMs: 0, endMs: 900 }],
    });
    const untimed = upload({ lines: [{ speaker: "customer", text: " Hello " }] });

    expect(timed.success && untimed.success).toBe(true);
    expect(untimed.data?.transcripts[0]).toMatchObject({
      language: "en-IN",
      lines: [{ text: "Hello" }],
    });
  });

  it("refuses mixed times, half a time, an end before its start and an unnamed language", () => {
    const results = [
      upload({
        lines: [
          { speaker: "agent", text: "Hi", startMs: 0, endMs: 900 },
          { speaker: "customer", text: "Hello" },
        ],
      }),
      upload({ lines: [{ speaker: "agent", text: "Hi", startMs: 0 }] }),
      upload({ lines: [{ speaker: "agent", text: "Hi", startMs: 900, endMs: 100 }] }),
      upload({ language: "auto", lines: [{ speaker: "agent", text: "Hi" }] }),
      upload({ lines: [] }),
    ];

    expect(results.map((r) => r.success)).toEqual([false, false, false, false, false]);
  });

  it("gives calls an input and timing, as audio with times when older data has none", () => {
    expect(callSummarySchema.shape.input.parse(undefined)).toBe("audio");
    expect(callSummarySchema.shape.timed.parse(undefined)).toBe(true);
  });
});
