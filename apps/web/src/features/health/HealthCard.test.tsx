import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw";
import { renderWithProviders } from "@/test/render";

import { HealthCard } from "./components/HealthCard";

// The component is rendered against MSW (src/test/msw.ts): the request goes
// through the real apiFetch, URL and Zod parse, and server.use changes the
// answer for one test.
describe("HealthCard", () => {
  it("shows the pending state, then the status and version", async () => {
    const paths: string[] = [];
    server.use(
      http.get("*/healthz", ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json({ status: "ok", version: "1.2.3" });
      }),
    );

    renderWithProviders(<HealthCard />);

    expect(screen.getByRole("status")).toHaveTextContent(/checking the api/i);
    expect(await screen.findByText("ok")).toBeInTheDocument();
    expect(screen.getByText("1.2.3")).toBeInTheDocument();
    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/\/healthz$/);
  });

  it("shows the error and retries from a keyboard-reachable button", async () => {
    let calls = 0;
    server.use(
      http.get("*/healthz", () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ error: "down" }, { status: 503 })
          : HttpResponse.json({ status: "ok" });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<HealthCard />);

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByRole("status")).toHaveTextContent("GET /healthz: 503");
    await user.tab();
    expect(retry).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("ok")).toBeInTheDocument();
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it("treats a body that fails the schema as an error", async () => {
    server.use(http.get("*/healthz", () => HttpResponse.json({ status: 42 })));

    renderWithProviders(<HealthCard />);

    expect(await screen.findByText(/failed validation/)).toBeInTheDocument();
  });
});
