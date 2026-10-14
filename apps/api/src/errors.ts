import type { ErrorRequestHandler, RequestHandler } from "express";
import type {} from "pino-http";
import { ZodError } from "zod";

// Domain errors and their single mapping to the JSON error envelope.
// Services throw AppError subclasses; routes never build an error body.

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}

export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = "bad_request",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "sign in required") {
    super(message, 401, "unauthorized");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "your role cannot do this") {
    super(message, 403, "forbidden");
  }
}

/** NotFoundError: missing or not visible to the caller; both answer the same (tenet 4). */
export class NotFoundError extends AppError {
  constructor(message = "not found") {
    super(message, 404, "not_found");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "conflict");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 503, "service_unavailable");
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: "not_found",
      message: `route ${req.method} ${req.path} not found`,
      requestId: req.id as string,
    },
  } satisfies ErrorEnvelope);
};

/** errorHandler maps every failure to the envelope; unknown errors are logged once and hidden. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const requestId = req.id as string;
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: { code: error.code, message: error.message, details: error.details, requestId },
    } satisfies ErrorEnvelope);
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_error",
        message: error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "),
        details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        requestId,
      },
    } satisfies ErrorEnvelope);
    return;
  }
  if (isBodyParserError(error)) {
    res
      .status(error.status)
      .json({ error: { code: "bad_request", message: error.message, requestId } });
    return;
  }
  req.log.error({ err: error }, "unhandled error");
  res
    .status(500)
    .json({
      error: { code: "internal", message: "internal error", requestId },
    } satisfies ErrorEnvelope);
};

function isBodyParserError(error: unknown): error is { status: number; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  );
}
