import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { StatusPage } from "./StatusPage";

// Managing incidents needs a signed-in manager: stand the session in for one.
vi.mock("@/features/auth/session", () => ({
  useSession: () => ({ status: "signed_in", userId: "u1", email: "m@test" }),
}));

const status = () => ({
  overall: "degraded",
  checkedAt: "2026-10-18T09:00:00.000Z",
  components: [],
  notices: [
    {
      id: "n1111111-1111-4111-8111-111111111111",
      title: "Transcription delayed",
      body: "",
      severity: "degraded",
      startedAt: "2026-10-18T08:00:00.000Z",
      resolvedAt: null,
    },
  ],
});

describe("status incidents (ADR-0026)", () => {
  it("lets a signed-in manager post and resolve incidents", async () => {
    const posted: unknown[] = [];
    const resolved: string[] = [];
    server.use(
      http.get("*/api/status", () => HttpResponse.json(status())),
      http.get("*/api/me", () =>
        HttpResponse.json({
          id: "u1",
          email: "m@test",
          displayName: "Mira",
          role: "manager",
          agentId: null,
        }),
      ),
      http.post("*/api/status/notices", async ({ request }) => {
        posted.push(await request.json());
        return HttpResponse.json({ id: "n2" }, { status: 201 });
      }),
      http.post("*/api/status/notices/:id/resolve", ({ params }) => {
        resolved.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderInRouter(<StatusPage />);

    const manage = within(await screen.findByRole("region", { name: "Post an incident" }));
    await userEvent.type(
      manage.getByRole("textbox", { name: "What is happening" }),
      "Model provider slow",
    );
    await userEvent.click(manage.getByRole("button", { name: "Post" }));
    await userEvent.click(manage.getByRole("button", { name: "Mark resolved" }));

    await waitFor(() => {
      expect(resolved).toEqual(["n1111111-1111-4111-8111-111111111111"]);
    });
    expect(posted).toEqual([{ title: "Model provider slow", severity: "degraded" }]);
  });
});
