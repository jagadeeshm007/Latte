import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { server } from "./msw";

// jsdom has no layout; the router's scroll restoration calls this on navigation.
Object.defineProperty(window, "scrollTo", { value: () => undefined, writable: true });

// MSW answers fetch for every test; an unhandled request is a failure, never
// a silent network call. Only src/lib/api.test.ts stubs fetch with
// vi.stubGlobal, to assert on the request the client builds; that bypasses it.
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.unstubAllGlobals();
});

afterAll(() => {
  server.close();
});
