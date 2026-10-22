// @latte/sdk: the Latte API for machine clients (ADR-0019).
export { LatteClient, SDK_VERSION } from "./client.ts";
export type {
  BatchUploadResult,
  LatteClientOptions,
  TranscriptInput,
  UploadFile,
  WriteOptions,
} from "./client.ts";
export { parseTranscript, TranscriptParseError } from "./transcript.ts";
export type { ParseOptions } from "./transcript.ts";
export { ApiError, RateLimitError } from "./errors.ts";
export { verifyWebhookSignature } from "./webhook.ts";
export type * from "./types.ts";
export type { VerifyOptions } from "./webhook.ts";
