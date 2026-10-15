import type { RequestHandler } from "express";

import { AppError } from "./errors.ts";

/**
 * perUserLimit allows `max` requests per signed-in user per window, per
 * process: a brake on spending the model budget through repeated uploads or
 * retries (security review). Behind several API processes, divide by their count.
 */
export function perUserLimit(
  name: string,
  max: number,
  windowMs: number,
  now: () => number = Date.now,
): RequestHandler {
  const hits = new Map<string, number[]>();
  return (req, _res, next) => {
    const key = req.user?.id ?? "anonymous";
    const t = now();
    const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
    if (recent.length >= max) {
      throw new AppError(
        `too many ${name} requests; try again in a few minutes`,
        429,
        "rate_limited",
      );
    }
    recent.push(t);
    hits.set(key, recent);
    next();
  };
}
