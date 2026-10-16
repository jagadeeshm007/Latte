// Errors the client throws. Every API refusal carries the server's code and
// request id, so a support ticket can name the exact request.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** RateLimitError: the key is over a bucket's limit; retry after retryAfterSeconds. */
export class RateLimitError extends ApiError {
  constructor(
    message: string,
    requestId: string | null,
    readonly retryAfterSeconds: number,
    details?: unknown,
  ) {
    super(message, 429, "rate_limited", requestId, details);
    this.name = "RateLimitError";
  }
}
