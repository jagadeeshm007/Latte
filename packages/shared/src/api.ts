import { z } from "zod";

import { FINDING_STATUSES, ITEM_TYPES, rubricItemSchema, rubricItemsSchema } from "./rubric.ts";

// Request and response shapes of the REST API (/api). The API validates
// requests with these and the web app validates responses with them, so the
// two cannot drift (ADR-0001).

export const ROLES = ["qa_reviewer", "agent", "manager"] as const;
export type Role = (typeof ROLES)[number];

export const CALL_STATUSES = [
  "uploaded",
  "transcribing",
  "transcribed",
  "scoring",
  "scored",
  "failed",
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export const REVIEW_STATUSES = ["not_required", "pending", "done"] as const;
export const CHANNELS = ["agent", "customer"] as const;
export const FINDING_SOURCES = ["llm", "rule", "reviewer"] as const;
export const DECISIONS = ["agree", "disagree"] as const;

/**
 * Languages a call can be uploaded in (ADR-0014). English goes to Groq Whisper
 * and keeps word timestamps; the others go to Sarvam saaras:v4 and are
 * translated to English for the judge. "auto" lets Sarvam detect the language.
 */
export const LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "bn-IN", label: "Bengali" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "mr-IN", label: "Marathi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "od-IN", label: "Odia" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "auto", label: "Auto-detect (Indian)" },
] as const;
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [
  (typeof LANGUAGES)[number]["code"],
  ...(typeof LANGUAGES)[number]["code"][],
];
export const languageSchema = z.enum(LANGUAGE_CODES);
export type Language = z.infer<typeof languageSchema>;
export const ENGLISH: Language = "en-IN";

/** isRegional tells whether a call goes to the regional speech-to-text route and gets translated. */
export function isRegional(language: Language): boolean {
  return language !== ENGLISH;
}

export const FLAGS = ["flagged", "passed", "pending"] as const;
export type Flag = (typeof FLAGS)[number];
export const CALL_GROUPS = ["agent", "team", "product", "language", "status", "flag"] as const;
export type CallGroup = (typeof CALL_GROUPS)[number];

/** Files per sign or confirm request; a batch is filled over several of them. */
export const MAX_UPLOAD_FILES = 50;
/** Calls one batch can hold. */
export const MAX_BATCH_FILES = 500;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const AUDIO_MIME_TYPES = ["audio/wav", "audio/mpeg"] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const timestamp = z.string();

export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: z.enum(ROLES),
  agentId: z.string().nullable(),
});
export type Me = z.infer<typeof meSchema>;

export const referenceSchema = z.object({
  agents: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      teamId: z.string(),
      externalCode: z.string().nullable(),
    }),
  ),
  teams: z.array(z.object({ id: z.string(), name: z.string() })),
  products: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type Reference = z.infer<typeof referenceSchema>;

export const uploadSignRequestSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(AUDIO_MIME_TYPES, { message: "only WAV or MP3 recordings are accepted" }),
        size: z
          .number()
          .int()
          .positive()
          .max(MAX_UPLOAD_BYTES, { message: "each file must be 50 MB or smaller" }),
      }),
    )
    .min(1)
    .max(MAX_UPLOAD_FILES, { message: `at most ${String(MAX_UPLOAD_FILES)} files per upload` }),
});
export type UploadSignRequest = z.infer<typeof uploadSignRequestSchema>;

export const uploadSignResponseSchema = z.object({
  uploads: z.array(z.object({ path: z.string(), signedUrl: z.string(), token: z.string() })),
});
export type UploadSignResponse = z.infer<typeof uploadSignResponseSchema>;

export const uploadConfirmRequestSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        originalFilename: z.string().min(1).max(255),
        mimeType: z.enum(AUDIO_MIME_TYPES),
        sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
        agentId: z.uuid(),
        teamId: z.uuid(),
        productId: z.uuid(),
        callDate: isoDate,
        /** Older clients send none: English. */
        language: languageSchema.default(ENGLISH),
      }),
    )
    .min(1)
    .max(MAX_UPLOAD_FILES),
  /** Add to a batch this caller started (to upload a large batch in chunks); otherwise a new batch. */
  batchId: z.uuid().optional(),
  /** Name for a new batch; ignored when adding to one. */
  batchName: z.string().trim().min(1).max(120).optional(),
});
export type UploadConfirmRequest = z.infer<typeof uploadConfirmRequestSchema>;

export const uploadConfirmResponseSchema = z.object({
  batchId: z.string(),
  callIds: z.array(z.string()),
});
export type UploadConfirmResponse = z.infer<typeof uploadConfirmResponseSchema>;

export const callSummarySchema = z.object({
  id: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  teamName: z.string(),
  productName: z.string(),
  callDate: isoDate,
  originalFilename: z.string(),
  language: languageSchema,
  status: z.enum(CALL_STATUSES),
  error: z.string().nullable(),
  durationMs: z.number().nullable(),
  createdAt: timestamp,
  overallScore: z.number().nullable(),
  judgeStatus: z.string().nullable(),
  needsReview: z.boolean().nullable(),
  reviewStatus: z.enum(REVIEW_STATUSES).nullable(),
  breaches: z.number(),
  missed: z.number(),
  /** flagged: a breach, a missed mandatory item or a review pending; passed: scored clean; pending: not scored yet. */
  flag: z.enum(FLAGS),
  /** Set when archived: hidden from lists and the queue, still counted (ADR-0015). */
  archivedAt: timestamp.nullable(),
  batchId: z.string(),
  batchName: z.string(),
});
export type CallSummary = z.infer<typeof callSummarySchema>;

export const callListSchema = z.object({
  items: z.array(callSummarySchema),
  nextCursor: z.string().nullable(),
  /** Calls matching the filters, for numbered pages. */
  total: z.number(),
});
export type CallList = z.infer<typeof callListSchema>;

export const callListQuerySchema = z.object({
  status: z.enum(CALL_STATUSES).optional(),
  needsReview: z.enum(["true", "false"]).optional(),
  agentId: z.uuid().optional(),
  teamId: z.uuid().optional(),
  productId: z.uuid().optional(),
  language: languageSchema.optional(),
  flag: z.enum(FLAGS).optional(),
  /** Searches the file name, agent, team and product. */
  q: z.string().trim().max(100).optional(),
  batchId: z.uuid().optional(),
  /** "true" lists archived calls only; otherwise archived calls are left out. */
  archived: z.enum(["true", "false"]).optional(),
  /** Orders by the group first so a page keeps each group together. */
  groupBy: z.enum(CALL_GROUPS).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** Numbered pages (with limit as the page size); cursor paging stays for older callers. */
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  cursor: z.string().optional(),
});
export type CallListQuery = z.infer<typeof callListQuerySchema>;

/** One spoken word in call time, for the read-along transcript. */
export const wordSchema = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});
export type Word = z.infer<typeof wordSchema>;

export const segmentSchema = z.object({
  seq: z.number(),
  channel: z.enum(CHANNELS),
  startMs: z.number(),
  endMs: z.number(),
  text: z.string(),
  language: z.string().nullable(),
  avgLogprob: z.number().nullable(),
  /** Empty for calls transcribed before word timestamps were recorded, and for regional calls. */
  words: z.array(wordSchema),
  /** English translation of a regional line, which the judge read; null for English lines. */
  translation: z.string().nullable(),
});
export type Segment = z.infer<typeof segmentSchema>;

export const findingSchema = z.object({
  id: z.string(),
  itemKey: z.string(),
  itemType: z.enum(ITEM_TYPES),
  status: z.enum(FINDING_STATUSES),
  source: z.enum(FINDING_SOURCES),
  quote: z.string().nullable(),
  segmentSeq: z.number().nullable(),
  startMs: z.number().nullable(),
  endMs: z.number().nullable(),
  channel: z.enum(CHANNELS).nullable(),
  rationale: z.string().nullable(),
  grounded: z.boolean(),
  review: z
    .object({
      decision: z.enum(DECISIONS),
      note: z.string().nullable(),
      reviewerName: z.string(),
      updatedAt: timestamp,
    })
    .nullable(),
});
export type Finding = z.infer<typeof findingSchema>;

export const callDetailSchema = z.object({
  call: callSummarySchema,
  audioAvailable: z.boolean(),
  score: z
    .object({
      id: z.string(),
      rubricVersion: z.number(),
      talkRatio: z.number(),
      coachingNotes: z.array(z.string()),
      judgeError: z.string().nullable(),
      reviewedBy: z.string().nullable(),
      reviewedAt: timestamp.nullable(),
    })
    .nullable(),
  rubricItems: z.array(rubricItemSchema),
  segments: z.array(segmentSchema),
  findings: z.array(findingSchema),
});
export type CallDetail = z.infer<typeof callDetailSchema>;

export const audioUrlSchema = z.object({ url: z.string(), expiresInSeconds: z.number() });

/** download asks for a link that saves the file under its original name instead of playing it. */
export const audioUrlRequestSchema = z.object({ download: z.boolean().optional() }).default({});

export const reviewDecisionRequestSchema = z.object({
  decision: z.enum(DECISIONS),
  note: z.string().max(2000).optional(),
});

export const addFindingRequestSchema = z.object({
  itemKey: z.string().min(1),
  status: z.enum(FINDING_STATUSES),
  segmentSeq: z.number().int().nonnegative().optional(),
  note: z.string().max(2000).optional(),
});

export const queueSchema = z.object({ items: z.array(callSummarySchema) });

export const scorecardSchema = z.object({
  agent: z.object({ id: z.string(), name: z.string(), teamName: z.string() }),
  callsScored: z.number(),
  avgOverall: z.number().nullable(),
  avgTalkRatio: z.number().nullable(),
  prohibitedCount: z.number(),
  items: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(ITEM_TYPES),
      applicable: z.number(),
      passed: z.number(),
      passRate: z.number().nullable(),
    }),
  ),
  coaching: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      misses: z.number(),
      examples: z.array(z.object({ callId: z.string(), note: z.string().nullable() })),
    }),
  ),
  recentCalls: z.array(callSummarySchema),
});
export type Scorecard = z.infer<typeof scorecardSchema>;

export const agreementSchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(ITEM_TYPES),
      agreed: z.number(),
      disagreed: z.number(),
      judgeMisses: z.number(),
      rate: z.number().nullable(),
    }),
  ),
});
export type Agreement = z.infer<typeof agreementSchema>;

/** How the dashboard groups calls; language groups are named by their code (en-IN, hi-IN). */
export const DASHBOARD_GROUPS = ["team", "product", "agent", "language"] as const;
export type DashboardGroup = (typeof DASHBOARD_GROUPS)[number];

export const dashboardQuerySchema = z.object({
  groupBy: z.enum(DASHBOARD_GROUPS).default("team"),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const dashboardSchema = z.object({
  groupBy: z.enum(DASHBOARD_GROUPS),
  groups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      callsScored: z.number(),
      flagged: z.number(),
      flagRate: z.number().nullable(),
      avgOverall: z.number().nullable(),
      items: z.array(z.object({ key: z.string(), passRate: z.number().nullable() })),
    }),
  ),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

/** Columns the leaderboard can sort on; the API maps each to a fixed ORDER BY. */
export const LEADERBOARD_SORTS = ["name", "calls", "avgScore", "flagRate", "breaches"] as const;
export type LeaderboardSort = (typeof LEADERBOARD_SORTS)[number];

export const leaderboardQuerySchema = z.object({
  groupBy: z.enum(DASHBOARD_GROUPS).default("agent"),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(LEADERBOARD_SORTS).default("avgScore"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  /** Groups with fewer scored calls are left out; 0 keeps groups with no calls. */
  minCalls: z.coerce.number().int().min(0).max(10_000).default(1),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

const leaderRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  callsScored: z.number(),
  flagged: z.number(),
  flagRate: z.number().nullable(),
  avgOverall: z.number().nullable(),
  breaches: z.number(),
  items: z.array(z.object({ key: z.string(), passRate: z.number().nullable() })),
});
export type LeaderRow = z.infer<typeof leaderRowSchema>;

export const leaderboardSchema = z.object({
  groupBy: z.enum(DASHBOARD_GROUPS),
  items: z.array(leaderRowSchema),
  total: z.number(),
});
export type Leaderboard = z.infer<typeof leaderboardSchema>;

export const highlightsQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});

/** A headline number this period and over the period of equal length before it. */
const kpiSchema = z.object({ value: z.number().nullable(), previous: z.number().nullable() });

export const highlightsSchema = z.object({
  from: isoDate,
  to: isoDate,
  previousFrom: isoDate,
  previousTo: isoDate,
  kpis: z.object({
    callsScored: kpiSchema,
    avgScore: kpiSchema,
    flagRate: kpiSchema,
    breaches: kpiSchema,
    /** Calls waiting for QA right now; it has no previous period. */
    reviewBacklog: z.number(),
  }),
  topAgents: z.array(leaderRowSchema),
  bottomAgents: z.array(leaderRowSchema),
  riskiestTeams: z.array(leaderRowSchema),
  failedItems: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      failed: z.number(),
      applicable: z.number(),
      failRate: z.number(),
    }),
  ),
  languageMix: z.array(z.object({ name: z.string(), calls: z.number() })),
  productMix: z.array(z.object({ name: z.string(), calls: z.number() })),
});
export type Highlights = z.infer<typeof highlightsSchema>;

export const usageSchema = z.object({
  monthStart: isoDate,
  budgetUsd: z.number(),
  spentUsd: z.number(),
  byPurpose: z.array(
    z.object({ purpose: z.string(), calls: z.number(), costUsd: z.number(), refused: z.number() }),
  ),
});
export type Usage = z.infer<typeof usageSchema>;

export const usageHistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(366).default(30),
});

/** Model calls per day and purpose, oldest first, for the spend chart (US-02-001). */
export const usageHistorySchema = z.object({
  from: isoDate,
  to: isoDate,
  days: z.array(
    z.object({
      day: isoDate,
      purpose: z.string(),
      calls: z.number(),
      costUsd: z.number(),
      audioSeconds: z.number(),
      characters: z.number(),
      refused: z.number(),
    }),
  ),
});
export type UsageHistory = z.infer<typeof usageHistorySchema>;

export const rubricSchema = z.object({
  id: z.string(),
  version: z.number(),
  name: z.string(),
  items: z.array(rubricItemSchema),
  isActive: z.boolean(),
  createdAt: timestamp,
});
export type Rubric = z.infer<typeof rubricSchema>;

export const rubricListSchema = z.object({ items: z.array(rubricSchema) });

export const saveRubricRequestSchema = z.object({
  name: z.string().min(1).max(80),
  items: rubricItemsSchema,
});

export const errorEnvelopeSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string().optional() }),
});

/** Where a batch stands: calls still queued or running, all done, or some failed. */
export const BATCH_STATES = ["processing", "completed", "has_failures"] as const;
export type BatchState = (typeof BATCH_STATES)[number];

export const batchSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(["web", "api"]),
  createdBy: z.string(),
  createdByName: z.string(),
  createdAt: timestamp,
  archivedAt: timestamp.nullable(),
  total: z.number(),
  queued: z.number(),
  processing: z.number(),
  scored: z.number(),
  failed: z.number(),
  flagged: z.number(),
  avgScore: z.number().nullable(),
  state: z.enum(BATCH_STATES),
});
export type Batch = z.infer<typeof batchSchema>;

export const batchDetailSchema = batchSchema.extend({
  breaches: z.number(),
  audioMs: z.number(),
  costUsd: z.number(),
  lastActivityAt: timestamp.nullable(),
});
export type BatchDetail = z.infer<typeof batchDetailSchema>;

export const batchListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  state: z.enum(BATCH_STATES).optional(),
  archived: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const batchListSchema = z.object({ items: z.array(batchSchema), total: z.number() });
export type BatchList = z.infer<typeof batchListSchema>;

export const batchUpdateRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    archived: z.boolean().optional(),
  })
  .refine((b) => b.name !== undefined || b.archived !== undefined, "nothing to change");
export type BatchUpdateRequest = z.infer<typeof batchUpdateRequestSchema>;

/** What a batch ZIP holds; results.csv is always in it. */
export const BATCH_EXPORT_PARTS = ["audio", "transcripts"] as const;
export type BatchExportPart = (typeof BATCH_EXPORT_PARTS)[number];
/** Batches above this many calls export as CSV only; a ZIP of them would run for too long. */
export const MAX_ZIP_CALLS = 200;

export const batchExportQuerySchema = z.object({
  include: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",") : []))
    .pipe(z.array(z.enum(BATCH_EXPORT_PARTS))),
});

export const batchRetryResponseSchema = z.object({ queued: z.number() });

/** What an API key may do; a key holds at least one (ADR-0018). */
export const API_SCOPES = [
  "calls:read",
  "calls:write",
  "batches:read",
  "batches:write",
  "exports:read",
  "analytics:read",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

/**
 * Rate-limit buckets, one per kind of work: reads, single uploads and
 * changes, batch work, and bulk exports. Each has its own window and limit.
 */
export const API_BUCKETS = ["read", "single", "batch", "bulk"] as const;
export type ApiBucket = (typeof API_BUCKETS)[number];

export const BUCKET_WINDOW_SECONDS: Record<ApiBucket, number> = {
  read: 60,
  single: 60,
  batch: 60,
  bulk: 3600,
};
export const DEFAULT_BUCKET_LIMITS: Record<ApiBucket, number> = {
  read: 600,
  single: 60,
  batch: 20,
  bulk: 10,
};
/** Per bucket, the most a key can be given: the server's protection, not a plan. */
export const MAX_BUCKET_LIMITS: Record<ApiBucket, number> = {
  read: 6000,
  single: 600,
  batch: 200,
  bulk: 100,
};

const bucketLimitsSchema = z
  .object({
    read: z.number().int().min(1).max(MAX_BUCKET_LIMITS.read),
    single: z.number().int().min(1).max(MAX_BUCKET_LIMITS.single),
    batch: z.number().int().min(1).max(MAX_BUCKET_LIMITS.batch),
    bulk: z.number().int().min(1).max(MAX_BUCKET_LIMITS.bulk),
  })
  .partial();
export type BucketLimits = z.infer<typeof bucketLimitsSchema>;

export const apiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Shown in place of the key: latte_<prefix>_… */
  prefix: z.string(),
  scopes: z.array(z.enum(API_SCOPES)),
  /** Effective limits per bucket, defaults filled in. */
  limits: z.object({
    read: z.number(),
    single: z.number(),
    batch: z.number(),
    bulk: z.number(),
  }),
  createdBy: z.string(),
  createdByName: z.string(),
  createdAt: timestamp,
  lastUsedAt: timestamp.nullable(),
  expiresAt: timestamp.nullable(),
  revokedAt: timestamp.nullable(),
  requests24h: z.number(),
});
export type ApiKey = z.infer<typeof apiKeySchema>;

export const apiKeyListSchema = z.object({ items: z.array(apiKeySchema) });

export const createApiKeyRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z
    .array(z.enum(API_SCOPES))
    .min(1, "choose at least one scope")
    .refine((s) => new Set(s).size === s.length, "a scope is listed twice"),
  /** Days until it stops working; none means it works until revoked. */
  expiresInDays: z.number().int().min(1).max(730).nullable().default(null),
  limits: bucketLimitsSchema.default({}),
});
export type CreateApiKeyRequest = z.input<typeof createApiKeyRequestSchema>;

/** The new key and its secret, which is shown this once and never stored. */
export const createdApiKeySchema = z.object({ key: apiKeySchema, secret: z.string() });
export type CreatedApiKey = z.infer<typeof createdApiKeySchema>;

export const updateApiKeyRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    limits: bucketLimitsSchema.optional(),
  })
  .refine((b) => b.name !== undefined || b.limits !== undefined, "nothing to change");
export type UpdateApiKeyRequest = z.infer<typeof updateApiKeyRequestSchema>;

export const apiKeyMetricsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export const apiKeyMetricsSchema = z.object({
  days: z.array(
    z.object({
      day: isoDate,
      ok: z.number(),
      clientErrors: z.number(),
      serverErrors: z.number(),
      rateLimited: z.number(),
      p95Ms: z.number().nullable(),
    }),
  ),
  totals: z.object({
    requests: z.number(),
    errorRate: z.number().nullable(),
    p50Ms: z.number().nullable(),
    p95Ms: z.number().nullable(),
  }),
  buckets: z.array(
    z.object({
      bucket: z.enum(API_BUCKETS),
      requests: z.number(),
      limit: z.number(),
      windowSeconds: z.number(),
      /** Requests counted in the window running now. */
      used: z.number(),
    }),
  ),
  routes: z.array(
    z.object({
      method: z.string(),
      route: z.string(),
      requests: z.number(),
      errors: z.number(),
      p95Ms: z.number().nullable(),
    }),
  ),
});
export type ApiKeyMetrics = z.infer<typeof apiKeyMetricsSchema>;

export const STATUS_CLASSES = ["2xx", "4xx", "5xx", "429"] as const;

export const apiKeyLogsQuerySchema = z.object({
  status: z.enum(STATUS_CLASSES).optional(),
  bucket: z.enum(API_BUCKETS).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const apiKeyLogsSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      method: z.string(),
      route: z.string(),
      bucket: z.enum(API_BUCKETS),
      status: z.number(),
      durationMs: z.number(),
      requestId: z.string(),
      createdAt: timestamp,
    }),
  ),
  total: z.number(),
});
export type ApiKeyLogs = z.infer<typeof apiKeyLogsSchema>;
