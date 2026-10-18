import { DEFAULT_RUBRIC } from "@scc/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { detail } from "@/test/fixtures";
import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { CallDetailPage } from "./calls/CallDetailPage";
import { RubricPage } from "./manager/RubricPage";
import { TeamsPage } from "./settings/TeamsPage";

// Phase D in the app: masked personal data with a recorded reveal, a rubric
// per product, and retention per team (ADR-0023).

const CALL_ID = "11111111-1111-4111-8111-111111111111";
const me = (role: "qa_reviewer" | "manager" | "agent") => ({
  id: "u1",
  email: "u@test",
  displayName: "Test User",
  role,
  agentId: role === "agent" ? "a1" : null,
});
const rubric = (over: Record<string, unknown> = {}) => ({
  id: "r1",
  version: 3,
  name: "Default",
  items: DEFAULT_RUBRIC,
  isActive: true,
  createdAt: "2026-10-01T00:00:00Z",
  productId: null,
  ...over,
});

describe("personal data on the call page", () => {
  it("says what is hidden and lets QA reveal it, asking the API for the unmasked view", async () => {
    const asked: string[] = [];
    server.use(
      http.get("*/api/me", () => HttpResponse.json(me("qa_reviewer"))),
      http.get("*/api/calls/:id", ({ request }) => {
        const reveal = new URL(request.url).searchParams.get("reveal");
        asked.push(reveal ?? "none");
        return HttpResponse.json(detail({ redactions: reveal ? 0 : 2 }));
      }),
    );
    await renderInRouter(<CallDetailPage callId={CALL_ID} />);

    expect(await screen.findByText(/2 pieces of personal data are hidden/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reveal personal data" }));

    expect(await screen.findByText(/Personal data is shown/)).toBeInTheDocument();
    expect(asked).toEqual(["none", "pii"]);
  });

  it("offers an agent no way to reveal it", async () => {
    server.use(
      http.get("*/api/me", () => HttpResponse.json(me("agent"))),
      http.get("*/api/calls/:id", () => HttpResponse.json(detail({ redactions: 1 }))),
    );
    await renderInRouter(<CallDetailPage callId={CALL_ID} />);

    expect(await screen.findByText(/1 piece of personal data is hidden/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal personal data" })).not.toBeInTheDocument();
  });
});

describe("rubric per product", () => {
  it("shows that a product uses the default, and starts its own rubric from it", async () => {
    const saved: unknown[] = [];
    server.use(
      http.get("*/api/me", () => HttpResponse.json(me("manager"))),
      http.get("*/api/reference", () =>
        HttpResponse.json({
          agents: [],
          teams: [],
          products: [{ id: "p1111111-1111-4111-8111-111111111111", name: "ULIP" }],
        }),
      ),
      http.get("*/api/rubrics/active", () => HttpResponse.json(rubric())),
      http.get("*/api/rubrics", ({ request }) =>
        HttpResponse.json({
          items: new URL(request.url).searchParams.get("productId") ? [] : [rubric()],
        }),
      ),
      http.post("*/api/rubrics", async ({ request }) => {
        saved.push(await request.json());
        return HttpResponse.json(
          rubric({ id: "r2", version: 4, productId: "p1111111-1111-4111-8111-111111111111" }),
          {
            status: 201,
          },
        );
      }),
    );
    await renderInRouter(<RubricPage />);

    await userEvent.click(await screen.findByRole("combobox", { name: "Rubric for" }));
    await userEvent.click(await screen.findByRole("option", { name: "ULIP" }));
    expect(await screen.findByText(/ULIP has no rubric of its own/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Create a rubric for ULIP" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save as version 4" }));

    await waitFor(() => {
      expect(saved).toEqual([
        expect.objectContaining({ productId: "p1111111-1111-4111-8111-111111111111" }),
      ]);
    });
  });
});

describe("retention per team", () => {
  it("saves a team's retention, and only once it changed", async () => {
    const saved: unknown[] = [];
    server.use(
      http.get("*/api/teams", () =>
        HttpResponse.json({
          defaultRetentionDays: 90,
          items: [
            {
              id: "t1",
              name: "Mumbai Inbound",
              audioRetentionDays: null,
              effectiveRetentionDays: 90,
              calls: 12,
            },
          ],
        }),
      ),
      http.patch("*/api/teams/t1", async ({ request }) => {
        saved.push(await request.json());
        return HttpResponse.json({
          id: "t1",
          name: "Mumbai Inbound",
          audioRetentionDays: 30,
          effectiveRetentionDays: 30,
          calls: 12,
        });
      }),
    );
    await renderInRouter(<TeamsPage />);

    const row = within(await screen.findByRole("table", { name: "Teams" }));
    const save = row.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    await userEvent.type(
      row.getByRole("spinbutton", { name: "Days to keep Mumbai Inbound's recordings" }),
      "30",
    );
    await userEvent.click(save);

    await waitFor(() => {
      expect(saved).toEqual([{ audioRetentionDays: 30 }]);
    });
  });
});
