import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

// Unit tests: jsdom, Testing Library, MSW, coverage floors at 80 percent.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      // An absolute origin so MSW can match request URLs in node.
      env: { VITE_API_URL: "http://api.test" },
      restoreMocks: true,
      unstubGlobals: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/**/*.test.{ts,tsx}",
          "src/**/*.d.ts",
          "src/main.tsx",
          "src/test/**",
          "src/components/ui/**",
        ],
        thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  }),
);
