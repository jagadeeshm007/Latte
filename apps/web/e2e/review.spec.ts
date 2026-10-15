import { expect, test, type Page } from "@playwright/test";

import { detail, summary } from "../src/test/fixtures";

// F1 (docs/design/ux-flows.md): a QA reviewer opens the queue, plays a
// finding, decides on every finding and completes the review. The API and
// Supabase are mocked; the session is a stored Supabase session.

const me = {
  id: "u1",
  email: "qa@salescall.test",
  displayName: "Priya Nair (QA)",
  role: "qa_reviewer",
  agentId: null,
};

async function signedIn(page: Page) {
  await page.route("https://e2e-ref.supabase.co/**", (route) =>
    route.fulfill({ status: 200, json: {} }),
  );
  await page.addInitScript(() => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(
      "sb-e2e-ref-auth-token",
      JSON.stringify({
        access_token: "e2e-token",
        refresh_token: "e2e-refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: expiresAt,
        user: {
          id: "u1",
          email: "qa@salescall.test",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: "2026-10-01T00:00:00Z",
        },
      }),
    );
  });
}

test("QA reviews a flagged call from the queue to completion", async ({ page }) => {
  await signedIn(page);
  const call = detail();
  let decisions = 0;
  let completed = false;
  await page.route("http://api.e2e/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === "/api/me") return route.fulfill({ json: me });
    if (url.pathname === "/api/review/queue")
      return route.fulfill({ json: { items: completed ? [] : [summary()] } });
    if (url.pathname.endsWith("/audio-url"))
      return route.fulfill({ json: { url: "http://api.e2e/audio.wav", expiresInSeconds: 600 } });
    if (url.pathname.endsWith("/review") && method === "PUT") {
      decisions++;
      const id = url.pathname.split("/")[3];
      call.findings = call.findings.map((f) =>
        f.id === id
          ? {
              ...f,
              review: {
                decision: "agree",
                note: null,
                reviewerName: me.displayName,
                updatedAt: "2026-10-15T10:00:00Z",
              },
            }
          : f,
      );
      return route.fulfill({ status: 204 });
    }
    if (url.pathname.endsWith("/review/complete")) {
      completed = true;
      call.call = { ...call.call, reviewStatus: "done" };
      return route.fulfill({ status: 204 });
    }
    if (url.pathname.startsWith("/api/calls/")) return route.fulfill({ json: call });
    return route.fulfill({
      status: 404,
      json: { error: { code: "not_found", message: "unmocked" } },
    });
  });
  await page.route("http://api.e2e/audio.wav", (route) => route.fulfill({ status: 404 }));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  await page.getByRole("link", { name: "call-01.wav" }).click();

  await expect(page.getByRole("heading", { name: "call-01.wav" })).toBeVisible();
  await expect(page.getByText("1 finding still need a decision")).toBeVisible();
  const breach = page
    .getByRole("listitem")
    .filter({ hasText: "Promised guaranteed returns on a ULIP." });
  await breach.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(page.getByText("Every finding has a decision")).toBeVisible();
  await page.getByRole("button", { name: "Complete review" }).click();

  await expect(page.getByText("Review complete")).toBeVisible();
  expect(decisions).toBe(1);
});
