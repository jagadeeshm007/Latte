import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { resetPlayer } from "@/features/player/player-store";

import { server } from "./msw";

// findBy and waitFor wait up to 3 s: a lazily loaded page under coverage can take longer than the default 1 s.
configure({ asyncUtilTimeout: 3000 });

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
  resetPlayer();
  server.resetHandlers();
  vi.unstubAllGlobals();
});

afterAll(() => {
  server.close();
});
