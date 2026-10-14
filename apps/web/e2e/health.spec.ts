import { expect, test, type Route } from "@playwright/test";

// The API is mocked with page.route; no spec reaches a real server.
function ok(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", version: "e2e" }),
  });
}

function down(route: Route) {
  return route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ status: "down" }),
  });
}

test.describe("health", () => {
  test("shows the API status and version", async ({ page }) => {
    await page.route("**/healthz", ok);

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "API health" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("ok");
    await expect(page.getByRole("status")).toContainText("e2e");
  });

  test("recovers through a keyboard-reachable retry", async ({ page }) => {
    let apiDown = true;
    await page.route("**/healthz", (route) => (apiDown ? down(route) : ok(route)));

    await page.goto("/");

    const retry = page.getByRole("button", { name: "Retry" });
    await expect(retry).toBeVisible();
    await expect(page.getByRole("status")).toContainText("503");
    apiDown = false;
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("ok");
  });

  test("shows the not-found page for an unknown path", async ({ page }) => {
    await page.goto("/nowhere");

    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: "Back to the start" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
