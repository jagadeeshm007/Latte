import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { MembersPage } from "./MembersPage";

const member = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  email: "mira@example.com",
  displayName: "Mira",
  role: "manager",
  agentId: null,
  agentName: null,
  disabledAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

function serve() {
  const invites: unknown[] = [];
  const patches: unknown[] = [];
  server.use(
    http.get("*/api/me", () =>
      HttpResponse.json({
        id: "m1",
        email: "mira@example.com",
        displayName: "Mira",
        role: "manager",
        agentId: null,
      }),
    ),
    http.get("*/api/members", () =>
      HttpResponse.json({
        items: [
          member(),
          member({ id: "m2", displayName: "Neha", email: "neha@example.com", role: "qa_reviewer" }),
          member({
            id: "m3",
            displayName: "Ravi",
            role: "agent",
            agentId: "a1",
            agentName: "Ravi Kumar",
          }),
        ],
      }),
    ),
    http.get("*/api/reference", () =>
      HttpResponse.json({
        agents: [
          {
            id: "a1111111-1111-4111-8111-111111111111",
            name: "Ravi Kumar",
            teamId: "t1",
            externalCode: null,
          },
        ],
        teams: [],
        products: [],
      }),
    ),
    http.post("*/api/members", async ({ request }) => {
      invites.push(await request.json());
      return HttpResponse.json(member({ id: "m4" }), { status: 201 });
    }),
    http.patch("*/api/members/:id", async ({ request, params }) => {
      patches.push({ id: params.id, ...((await request.json()) as object) });
      return HttpResponse.json(member());
    }),
  );
  return { invites, patches };
}

describe("members (ADR-0024)", () => {
  it("lists people with their roles, and stops you turning yourself off", async () => {
    serve();
    await renderInRouter(<MembersPage />);

    const table = within(await screen.findByRole("table", { name: "Members" }));
    expect(table.getByText("Sales agent: Ravi Kumar")).toBeInTheDocument();
    expect(table.getByRole("switch", { name: "Mira can sign in" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("turns someone off and changes a role", async () => {
    const { patches } = serve();
    await renderInRouter(<MembersPage />);

    const table = within(await screen.findByRole("table", { name: "Members" }));
    await userEvent.click(table.getByRole("switch", { name: "Neha can sign in" }));
    await userEvent.click(table.getByRole("combobox", { name: "Role of Neha" }));
    await userEvent.click(await screen.findByRole("option", { name: "Manager" }));

    await waitFor(() => {
      expect(patches).toEqual([
        { id: "m2", disabled: true },
        { id: "m2", role: "manager" },
      ]);
    });
  });

  it("invites a sales agent linked to their agent record", async () => {
    const { invites } = serve();
    await renderInRouter(<MembersPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Invite someone" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.type(dialog.getByRole("textbox", { name: "Work email" }), "ravi@example.com");
    await userEvent.type(dialog.getByRole("textbox", { name: "Name" }), "Ravi");
    await userEvent.click(dialog.getByRole("combobox", { name: "Role" }));
    await userEvent.click(await screen.findByRole("option", { name: "Sales agent" }));
    const send = dialog.getByRole("button", { name: "Send invitation" });
    expect(send).toBeDisabled();
    await userEvent.click(dialog.getByRole("combobox", { name: "Agent record" }));
    await userEvent.click(await screen.findByRole("option", { name: "Ravi Kumar" }));
    await userEvent.click(send);

    await waitFor(() => {
      expect(invites).toEqual([
        {
          email: "ravi@example.com",
          displayName: "Ravi",
          role: "agent",
          agentId: "a1111111-1111-4111-8111-111111111111",
        },
      ]);
    });
  });
});
