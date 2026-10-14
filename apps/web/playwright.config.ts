import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build served by vite preview.
// The API is mocked with page.route in each spec; no test reaches a real server.
const port = 4173;
const isCI = Boolean(process.env.CI);

// Projects. `make test-e2e` runs chromium on every change; `make
// test-e2e-matrix` runs the same specs on every project (a CI job on main,
// develop and the nightly schedule). A spec that cannot run on a phone
// carries @desktop in its title and the mobile projects skip it. Visual specs
// live in e2e/visual/, run only in the "visual" project (one browser, one
// viewport, baselines made in the Playwright image) and never in the matrix.
const desktop = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
];
const mobile = [
  { name: "mobile-chrome", use: { ...devices["Pixel 7"] }, grepInvert: /@desktop/ },
  { name: "mobile-safari", use: { ...devices["iPhone 15"] }, grepInvert: /@desktop/ },
];

export default defineConfig({
  testDir: "e2e",
  // Baselines sit under e2e/__screenshots__/, one folder per spec, no OS suffix:
  // they are only ever written inside the Playwright image (make test-visual-update).
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  // Baselines and runs share one image, so the rendering is deterministic and
  // the tolerance is a few antialiased pixels, not a ratio: 1% of a 1280x800
  // page is 10,000 pixels, enough to hide a changed label.
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 20,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 2 } : {}),
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${String(port)}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm run build && pnpm exec vite preview --port ${String(port)} --strictPort`,
    url: `http://localhost:${String(port)}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  projects: [
    ...[...desktop, ...mobile].map((p) => ({ ...p, testIgnore: /visual\// })),
    {
      name: "visual",
      testMatch: /visual\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
