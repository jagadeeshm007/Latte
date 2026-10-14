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

export const MAX_UPLOAD_FILES = 10;
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
    z.object({ id: z.string(), name: z.string(), teamId: z.string(), externalCode: z.string().nullable() }),
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
      }),
    )
    .min(1)
    .max(MAX_UPLOAD_FILES),
});
export type UploadConfirmRequest = z.infer<typeof uploadConfirmRequestSchema>;

export const uploadConfirmResponseSchema = z.object({
  batchId: z.string(),
  callIds: z.array(z.string()),
});

export const callSummarySchema = z.object({
  id: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  teamName: z.string(),
  productName: z.string(),
  callDate: isoDate,
  originalFilename: z.string(),
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
});
export type CallSummary = z.infer<typeof callSummarySchema>;

export const callListSchema = z.object({
  items: z.array(callSummarySchema),
  nextCursor: z.string().nullable(),
});
export type CallList = z.infer<typeof callListSchema>;

export const callListQuerySchema = z.object({
  status: z.enum(CALL_STATUSES).optional(),
  needsReview: z.enum(["true", "false"]).optional(),
  agentId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const segmentSchema = z.object({
  seq: z.number(),
  channel: z.enum(CHANNELS),
  startMs: z.number(),
  endMs: z.number(),
  text: z.string(),
  language: z.string().nullable(),
  avgLogprob: z.number().nullable(),
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

export const dashboardQuerySchema = z.object({
  groupBy: z.enum(["team", "product"]).default("team"),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const dashboardSchema = z.object({
  groupBy: z.enum(["team", "product"]),
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

export const usageSchema = z.object({
  monthStart: isoDate,
  budgetUsd: z.number(),
  spentUsd: z.number(),
  byPurpose: z.array(
    z.object({ purpose: z.string(), calls: z.number(), costUsd: z.number(), refused: z.number() }),
  ),
});
export type Usage = z.infer<typeof usageSchema>;

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
