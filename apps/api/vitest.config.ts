import { defineConfig } from "vitest/config";

// Unit tests (src/**/*.test.ts) need nothing; integration tests
// (tests/integration) need the Postgres from `make db` (TEST_DATABASE_URL
// overrides). Neither reaches the network: the gateway is faked or replayed.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
    restoreMocks: true,
    unstubEnvs: true,
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.ts"],
      // Process entry points and CLIs are exercised by make dev and the seed, not by tests.
      exclude: [
        "src/**/*.test.ts",
        "src/server.ts",
        "src/vercel.ts",
        "src/worker.ts",
        "src/seed.ts",
        "src/env-check.ts",
        "src/gen-docs.ts",
        "src/load-seed.ts",
        "src/status.ts",
        "src/wiring.ts",
        "src/storage.ts",
        "src/logger.ts",
        "src/jobs/queue.ts",
        "src/types/**",
      ],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
