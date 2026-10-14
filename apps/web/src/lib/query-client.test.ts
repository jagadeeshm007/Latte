import { describe, expect, it } from "vitest";

import { ApiError } from "./api";
import { createQueryClient } from "./query-client";

function retryOf(client: ReturnType<typeof createQueryClient>) {
  const retry = client.getDefaultOptions().queries?.retry;
  if (typeof retry !== "function") {
    throw new Error("retry should be a function");
  }
  return retry;
}

describe("createQueryClient", () => {
  it("never retries a 4xx", () => {
    const retry = retryOf(createQueryClient());
    expect(retry(0, new ApiError("http", 404, "GET /x: 404"))).toBe(false);
  });

  it("retries a 5xx or network error once", () => {
    const retry = retryOf(createQueryClient());
    expect(retry(0, new ApiError("http", 503, "GET /x: 503"))).toBe(true);
    expect(retry(1, new ApiError("network", 0, "GET /x: network error"))).toBe(false);
  });
});
