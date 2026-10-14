/** GatewayError is the base of every error callModel throws. */
export class GatewayError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** BudgetExceededError: the month's spend has reached the budget; nothing was sent. */
export class BudgetExceededError extends GatewayError {
  constructor(
    readonly spentUsd: number,
    readonly budgetUsd: number,
  ) {
    super(`model budget exhausted: spent ${spentUsd.toFixed(4)} of ${budgetUsd.toFixed(2)} USD this month`);
  }
}

/** RateLimitedError: wait this long before trying again; the caller reschedules, never sleeps. */
export class RateLimitedError extends GatewayError {
  constructor(
    readonly waitMs: number,
    readonly model: string,
  ) {
    super(`rate limited on ${model}: retry in ${String(Math.ceil(waitMs / 1000))} s`);
  }
}

/** ProviderError: the provider answered with an error after the retries. */
export class ProviderError extends GatewayError {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** CassetteMissingError: replay mode found no recorded response for this request. */
export class CassetteMissingError extends GatewayError {
  constructor(readonly key: string) {
    super(`no recorded response for request ${key}; run the recording step with live keys`);
  }
}

/** ConfigurationError: the gateway cannot serve this kind of call as configured. */
export class ConfigurationError extends GatewayError {}
