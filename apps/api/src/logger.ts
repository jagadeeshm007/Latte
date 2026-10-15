import { pino, type Logger } from "pino";

import { type Config } from "./config.ts";

/**
 * createLogger is the one place a pino instance is made. JSON lines by
 * default; LOG_PRETTY=true switches to pino-pretty for a terminal. Headers
 * that carry credentials are redacted; code logs ids, never transcript text.
 */
export function createLogger(config: Pick<Config, "LOG_LEVEL" | "LOG_PRETTY">): Logger {
  return pino({
    level: config.LOG_LEVEL,
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
      censor: "[redacted]",
    },
    ...(config.LOG_PRETTY
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss" },
          },
        }
      : {}),
  });
}
