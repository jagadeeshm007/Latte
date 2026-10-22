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

/** Where a call's transcript came from: speech-to-text on audio, or lines the uploader sent (ADR-0030). */
export const CALL_INPUTS = ["audio", "transcript"] as const;
export type CallInput = (typeof CALL_INPUTS)[number];
export const SPEAKERS = ["agent", "customer"] as const;
export const MAX_TRANSCRIPT_LINES = 3000;
/** A transcript is stored as its lines; this caps one call's lines as sent, in bytes of JSON. */
export const MAX_TRANSCRIPT_BYTES = 1024 * 1024;

export const transcriptLineSchema = z
  .object({
    speaker: z.enum(SPEAKERS, { message: "speaker must be agent or customer" }),
    text: z.string().trim().min(1).max(5000),
    /** Milliseconds from the start of the call; give both times on every line, or on none. */
    startMs: z.number().int().min(0).optional(),
    endMs: z.number().int().min(0).optional(),
  })
  .refine((l) => (l.startMs === undefined) === (l.endMs === undefined), {
    message: "give startMs and endMs together",
  })
  .refine((l) => l.startMs === undefined || l.endMs === undefined || l.endMs >= l.startMs, {
    message: "endMs must not be before startMs",
  });
export type TranscriptLine = z.infer<typeof transcriptLineSchema>;

export const transcriptUploadRequestSchema = z.object({
  transcripts: z
    .array(
      z.object({
        /** A name people recognise, like the source file's. */
        originalFilename: z.string().min(1).max(255),
        agentId: z.uuid(),
        teamId: z.uuid(),
        productId: z.uuid(),
        callDate: isoDate,
        /** The transcript's language; auto-detection needs audio. */
        language: languageSchema
          .default(ENGLISH)
          .refine((l) => l !== "auto", { message: "name the transcript's language" }),
        lines: z
          .array(transcriptLineSchema)
          .min(1, { message: "a transcript needs at least one line" })
          .max(MAX_TRANSCRIPT_LINES, {
            message: `at most ${String(MAX_TRANSCRIPT_LINES)} lines per transcript`,
          })
          .refine(
            (lines) =>
              lines.every((l) => l.startMs !== undefined) ||
              lines.every((l) => l.startMs === undefined),
            { message: "give times on every line, or on none" },
          ),
      }),
    )
    .min(1)
    .max(MAX_UPLOAD_FILES, {
      message: `at most ${String(MAX_UPLOAD_FILES)} transcripts per upload`,
    }),
  /** Add to a batch this caller started; otherwise a new batch. */
  batchId: z.uuid().optional(),
  /** Name for a new batch; ignored when adding to one. */
  batchName: z.string().trim().min(1).max(120).optional(),
});
export type TranscriptUploadRequest = z.input<typeof transcriptUploadRequestSchema>;

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
  /** transcript: uploaded as lines, with no audio (ADR-0030). */
  input: z.enum(CALL_INPUTS).default("audio"),
  /** false when an uploaded transcript had no times: show line numbers, not times. */
  timed: z.boolean().default(true),
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
  /** Pieces of personal data masked in the transcript; 0 when revealed (ADR-0023). */
  redactions: z.number().default(0),
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
  /** The product this rubric scores; null for the default (older responses leave it out). */
  productId: z.string().nullable().default(null),
});
export type Rubric = z.infer<typeof rubricSchema>;

/** Which rubric to read: a product's own, or the default when productId is left out. */
export const rubricQuerySchema = z.object({ productId: z.uuid().optional() });

export const rubricListSchema = z.object({ items: z.array(rubricSchema) });

export const saveRubricRequestSchema = z.object({
  name: z.string().min(1).max(80),
  items: rubricItemsSchema,
  /** Save as this product's rubric; null (or left out) saves the default. */
  productId: z.uuid().nullable().default(null),
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
  "webhooks:write",
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
  /** What the key's uploads cost in the period: calls in its batches, and their model spend. */
  usage: z.object({ callsUploaded: z.number(), callsScored: z.number(), costUsd: z.number() }),
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

export const revokeAllKeysRequestSchema = z.object({
  /** Typed by the person, so all keys are never revoked by a stray click. */
  confirm: z.literal("REVOKE ALL"),
});
export const revokeAllKeysResponseSchema = z.object({ revoked: z.number() });

/** Events a webhook can subscribe to (ADR-0021); ping is the test event. */
export const WEBHOOK_EVENTS = [
  "call.scored",
  "call.failed",
  "batch.completed",
  "alert.triggered",
  "digest.ready",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number] | "ping";

export const webhookEndpointSchema = z.object({
  id: z.string(),
  url: z.string(),
  description: z.string(),
  events: z.array(z.enum(WEBHOOK_EVENTS)),
  createdBy: z.string(),
  createdAt: timestamp,
  disabledAt: timestamp.nullable(),
  disabledReason: z.string().nullable(),
  consecutiveFailures: z.number(),
  deliveries24h: z.number(),
  failures24h: z.number(),
});
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;
export const webhookEndpointListSchema = z.object({ items: z.array(webhookEndpointSchema) });

/** An https URL on the standard port with no credentials in it. */
export function isWebhookUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (url.port === "" || url.port === "443")
    );
  } catch {
    return false;
  }
}

const webhookUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(isWebhookUrl, "use an https:// URL on the standard port, with no user name or password");

export const createWebhookRequestSchema = z.object({
  url: webhookUrl,
  description: z.string().trim().max(200).default(""),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, "choose at least one event")
    .refine((e) => new Set(e).size === e.length, "an event is listed twice"),
});
export type CreateWebhookRequest = z.input<typeof createWebhookRequestSchema>;

export const updateWebhookRequestSchema = z
  .object({
    url: webhookUrl.optional(),
    description: z.string().trim().max(200).optional(),
    events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "nothing to change");
export type UpdateWebhookRequest = z.infer<typeof updateWebhookRequestSchema>;

/** The new endpoint and its signing secret, shown this once. */
export const createdWebhookSchema = z.object({
  endpoint: webhookEndpointSchema,
  secret: z.string(),
});
export type CreatedWebhook = z.infer<typeof createdWebhookSchema>;

export const webhookDeliverySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  status: z.enum(["pending", "succeeded", "failed"]),
  attempts: z.number(),
  lastStatus: z.number().nullable(),
  lastError: z.string().nullable(),
  nextAttemptAt: timestamp,
  deliveredAt: timestamp.nullable(),
  createdAt: timestamp,
  payload: z.unknown(),
});
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;
export const webhookDeliveryListSchema = z.object({
  items: z.array(webhookDeliverySchema),
  total: z.number(),
});
export const webhookDeliveryQuerySchema = z.object({
  status: z.enum(["pending", "succeeded", "failed"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/** Pages whose filters can be saved under a name. */
export const SAVED_VIEW_PAGES = ["calls", "performance", "batches"] as const;
export type SavedViewPage = (typeof SAVED_VIEW_PAGES)[number];

/** A page's filters: short scalar values only, as they would sit in a URL. */
const viewSearchSchema = z
  .record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()]))
  .refine((s) => Object.keys(s).length <= 30, "too many filters");

export const savedViewSchema = z.object({
  id: z.string(),
  page: z.enum(SAVED_VIEW_PAGES),
  name: z.string(),
  search: viewSearchSchema,
  shared: z.boolean(),
  ownerId: z.string(),
  ownerName: z.string(),
  mine: z.boolean(),
  updatedAt: timestamp,
});
export type SavedView = z.infer<typeof savedViewSchema>;
export const savedViewListSchema = z.object({ items: z.array(savedViewSchema) });
export const savedViewQuerySchema = z.object({ page: z.enum(SAVED_VIEW_PAGES) });

export const saveViewRequestSchema = z.object({
  page: z.enum(SAVED_VIEW_PAGES),
  name: z.string().trim().min(1).max(80),
  search: viewSearchSchema,
  shared: z.boolean().default(false),
});
export type SaveViewRequest = z.input<typeof saveViewRequestSchema>;

export const updateViewRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    search: viewSearchSchema.optional(),
    shared: z.boolean().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "nothing to change");
export type UpdateViewRequest = z.infer<typeof updateViewRequestSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  kind: z.enum(["alert", "digest", "batch"]),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  readAt: timestamp.nullable(),
  createdAt: timestamp,
});
export type Notification = z.infer<typeof notificationSchema>;
export const notificationListSchema = z.object({
  items: z.array(notificationSchema),
  total: z.number(),
  unread: z.number(),
});
export const notificationQuerySchema = z.object({
  unread: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const unreadCountSchema = z.object({ unread: z.number() });

export const ALERT_METRICS = ["flag_rate", "avg_score", "item_fail_rate"] as const;
export type AlertMetric = (typeof ALERT_METRICS)[number];
export const ALERT_SCOPES = ["team", "product", "agent"] as const;

const alertRuleFields = {
  name: z.string().trim().min(1).max(80),
  metric: z.enum(ALERT_METRICS),
  scope: z.enum(ALERT_SCOPES),
  itemKey: z.string().max(60).nullable().default(null),
  /** How far the window must move from the baseline, in points (percentage points, or score points). */
  thresholdPoints: z.number().positive().max(100),
  windowDays: z.number().int().min(1).max(30).default(7),
  baselineDays: z.number().int().min(7).max(180).default(28),
  minCalls: z.number().int().min(1).max(1000).default(5),
  cooldownHours: z.number().int().min(1).max(720).default(24),
  enabled: z.boolean().default(true),
};

export const alertRuleRequestSchema = z
  .object(alertRuleFields)
  .refine((r) => (r.metric === "item_fail_rate") === (r.itemKey !== null), {
    message: "choose a rubric item for an item fail rate, and only then",
    path: ["itemKey"],
  });
export type AlertRuleRequest = z.input<typeof alertRuleRequestSchema>;

export const alertRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  metric: z.enum(ALERT_METRICS),
  scope: z.enum(ALERT_SCOPES),
  itemKey: z.string().nullable(),
  thresholdPoints: z.number(),
  windowDays: z.number(),
  baselineDays: z.number(),
  minCalls: z.number(),
  cooldownHours: z.number(),
  enabled: z.boolean(),
  createdAt: timestamp,
  lastEvaluatedAt: timestamp.nullable(),
  firings30d: z.number(),
});
export type AlertRule = z.infer<typeof alertRuleSchema>;
export const alertRuleListSchema = z.object({ items: z.array(alertRuleSchema) });

export const alertFiringSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  ruleName: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  value: z.number(),
  baseline: z.number(),
  calls: z.number(),
  firedAt: timestamp,
});
export type AlertFiring = z.infer<typeof alertFiringSchema>;
export const alertFiringListSchema = z.object({ items: z.array(alertFiringSchema) });

export const DIGEST_FREQUENCIES = ["off", "daily", "weekly"] as const;
export const digestSettingSchema = z.object({ frequency: z.enum(DIGEST_FREQUENCIES) });
export type DigestSetting = z.infer<typeof digestSettingSchema>;

export const teamSettingsSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The team's own setting; null uses the default. */
  audioRetentionDays: z.number().nullable(),
  /** What applies: the team's setting or the default. */
  effectiveRetentionDays: z.number(),
  calls: z.number(),
});
export type TeamSettings = z.infer<typeof teamSettingsSchema>;
export const teamSettingsListSchema = z.object({
  items: z.array(teamSettingsSchema),
  defaultRetentionDays: z.number(),
});
export const updateTeamRequestSchema = z.object({
  audioRetentionDays: z.number().int().min(1).max(3650).nullable(),
});
export const callDetailQuerySchema = z.object({ reveal: z.enum(["pii"]).optional() });

export const memberSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: z.enum(ROLES),
  agentId: z.string().nullable(),
  agentName: z.string().nullable(),
  disabledAt: timestamp.nullable(),
  createdAt: timestamp,
});
export type Member = z.infer<typeof memberSchema>;
export const memberListSchema = z.object({ items: z.array(memberSchema) });

/** Invite someone: Supabase emails them a link; their role is set here, before they first sign in. */
export const inviteMemberRequestSchema = z
  .object({
    email: z.email().max(254),
    displayName: z.string().trim().min(1).max(80),
    role: z.enum(ROLES),
    agentId: z.uuid().nullable().default(null),
  })
  .refine((m) => (m.role === "agent") === (m.agentId !== null), {
    message: "an agent account links to an agent record, and only an agent account",
    path: ["agentId"],
  });
export type InviteMemberRequest = z.input<typeof inviteMemberRequestSchema>;

export const updateMemberRequestSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    agentId: z.uuid().nullable().optional(),
    disabled: z.boolean().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "nothing to change");
export type UpdateMemberRequest = z.infer<typeof updateMemberRequestSchema>;

export const billingPricesSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/, "a three-letter currency code"),
  /** Units of the currency per US dollar, for model spend. */
  usdRate: z.number().positive().max(100_000),
  perCall: z.number().min(0).max(1_000_000),
  perAudioMinute: z.number().min(0).max(1_000_000),
  modelMarkupPct: z.number().min(0).max(1000),
});
export type BillingPrices = z.infer<typeof billingPricesSchema>;

export const statementQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "YYYY-MM"),
});

const usageBreakdownSchema = z.array(
  z.object({
    name: z.string(),
    calls: z.number(),
    audioMinutes: z.number(),
    modelCostUsd: z.number(),
  }),
);

export const statementSchema = z.object({
  month: z.string(),
  from: isoDate,
  to: isoDate,
  prices: billingPricesSchema,
  lines: z.array(
    z.object({
      label: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitPrice: z.number(),
      amount: z.number(),
    }),
  ),
  total: z.number(),
  byTeam: usageBreakdownSchema,
  byProduct: usageBreakdownSchema,
  byApiKey: usageBreakdownSchema,
});
export type Statement = z.infer<typeof statementSchema>;

export const STATUS_COMPONENTS = ["api", "database", "storage", "processing", "models"] as const;
export type StatusComponent = (typeof STATUS_COMPONENTS)[number];
export const NOTICE_SEVERITIES = ["info", "degraded", "outage"] as const;

export const statusNoticeSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  severity: z.enum(NOTICE_SEVERITIES),
  startedAt: timestamp,
  resolvedAt: timestamp.nullable(),
});
export type StatusNotice = z.infer<typeof statusNoticeSchema>;

export const statusSchema = z.object({
  /** operational when every component is up and no outage is posted. */
  overall: z.enum(["operational", "degraded", "outage"]),
  checkedAt: timestamp,
  components: z.array(
    z.object({
      component: z.enum(STATUS_COMPONENTS),
      ok: z.boolean(),
      latencyMs: z.number().nullable(),
      detail: z.string().nullable(),
      /** Share of checks that passed per day, oldest first; null for a day with no checks. */
      history: z.array(z.object({ day: isoDate, uptime: z.number().nullable() })),
    }),
  ),
  notices: z.array(statusNoticeSchema),
});
export type Status = z.infer<typeof statusSchema>;

export const postNoticeRequestSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(2000).default(""),
  severity: z.enum(NOTICE_SEVERITIES),
});
export type PostNoticeRequest = z.input<typeof postNoticeRequestSchema>;
