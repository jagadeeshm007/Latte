import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // CLIs and the script data are exercised by make eval and make render-seed.
      exclude: ["src/**/*.test.ts", "src/run.ts", "src/render.ts", "src/build-calls.ts", "src/scripts.ts"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
