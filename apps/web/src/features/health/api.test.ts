import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { server } from "@/test/msw";

import { fetchHealth } from "./api";

// These tests go through MSW (src/test/msw.ts), not a stubbed fetch: the
// default handler answers, and server.use overrides it for one test.
describe("fetchHealth", () => {
  it("returns the default MSW answer", async () => {
    await expect(fetchHealth()).resolves.toEqual({ status: "ok", version: "msw" });
  });

  it("surfaces an HTTP failure as an ApiError", async () => {
    server.use(http.get("*/healthz", () => HttpResponse.json({ error: "down" }, { status: 503 })));

    await expect(fetchHealth()).rejects.toBeInstanceOf(ApiError);
  });

  it("passes the signal to fetch, so an aborted query cancels the request", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(fetchHealth({ signal: controller.signal })).rejects.toMatchObject({
      code: "network",
      details: { name: "AbortError" },
    });
  });
});
