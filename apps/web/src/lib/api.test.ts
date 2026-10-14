import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { jsonResponse } from "@/test/render";

import { ApiError, apiFetch } from "./api";

const schema = z.object({ id: z.string() });

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }
    throw error;
  }
  throw new Error("expected apiFetch to throw");
}

describe("apiFetch", () => {
  it("returns the parsed body and sends JSON headers", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ id: "a1", extra: true })));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch("/things/a1", schema, {
      method: "POST",
      body: JSON.stringify({ name: "x" }),
    });

    expect(result).toEqual({ id: "a1" });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("wraps a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("offline"))),
    );

    const error = await failure(apiFetch("/things", schema));

    expect(error.code).toBe("network");
    expect(error.status).toBe(0);
  });

  it("wraps a non-2xx status with the body as details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("nope", { status: 404, statusText: "Not Found" }))),
    );

    const error = await failure(apiFetch("/things/x", schema));

    expect(error.code).toBe("http");
    expect(error.status).toBe(404);
    expect(error.details).toBe("nope");
    expect(error.message).toBe("GET /things/x: 404 Not Found");
  });

  it("accepts 204 No Content when the schema allows no body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
    );

    await expect(
      apiFetch("/things/a1", z.undefined(), { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("rejects a 204 when the schema expects a body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
    );

    const error = await failure(apiFetch("/things/a1", schema));

    expect(error.code).toBe("invalid_response");
  });

  it("rejects a body that is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("<html>", { status: 200 }))),
    );

    const error = await failure(apiFetch("/things", schema));

    expect(error.code).toBe("invalid_json");
  });

  it("rejects a body that fails the schema with the issues as details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ id: 7 }))),
    );

    const error = await failure(apiFetch("/things", schema));

    expect(error.code).toBe("invalid_response");
    expect(Array.isArray(error.details)).toBe(true);
  });
});
