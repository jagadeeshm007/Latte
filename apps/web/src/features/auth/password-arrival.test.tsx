import { createMemoryHistory } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { arrivalReason } from "@/lib/arrival";
import { server } from "@/test/msw";
import { createTestQueryClient } from "@/test/render";

// SCC-7-1: someone who arrives from an invite or a reset link chooses a
// password before anything else, so they can sign in with it later.

const auth = vi.hoisted(() => ({
  session: {
    status: "signed_in",
    userId: "u1",
    email: "neha@example.com",
    passwordNeeded: "invite",
  },
  changePassword: vi.fn<(password: string) => Promise<string | null>>(),
}));
vi.mock("@/features/auth/session", () => ({
  useSession: () => auth.session,
  signIn: vi.fn(),
  signOut: vi.fn(),
  changePassword: auth.changePassword,
}));

function renderApp(path = "/") {
  return render(
    <App
      queryClient={createTestQueryClient()}
      history={createMemoryHistory({ initialEntries: [path] })}
    />,
  );
}

beforeEach(() => {
  auth.session = { ...auth.session, passwordNeeded: "invite" };
  auth.changePassword.mockReset();
  server.use(
    http.get("*/api/me", () =>
      HttpResponse.json({
        id: "u1",
        email: "neha@example.com",
        displayName: "Neha",
        role: "manager",
        agentId: null,
      }),
    ),
  );
});

describe("arriving from an emailed link", () => {
  it("asks an invited person to choose a password before showing any page", async () => {
    renderApp("/calls");

    expect(await screen.findByRole("heading", { name: "Choose a password" })).toBeInTheDocument();
    expect(screen.getByText(/neha@example.com/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /main/i })).not.toBeInTheDocument();
  });

  it("asks for a new password after a reset link", async () => {
    auth.session = { ...auth.session, passwordNeeded: "recovery" };

    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Choose a new password" }),
    ).toBeInTheDocument();
  });

  it("refuses a short or mismatched password and saves a good one", async () => {
    auth.changePassword.mockResolvedValue(null);
    renderApp();
    const [password, repeat] = await screen.findAllByLabelText(/New password|Repeat it/);
    const save = screen.getByRole("button", { name: "Save password" });

    await userEvent.type(password!, "short");
    expect(save).toBeDisabled();
    await userEvent.clear(password!);
    await userEvent.type(password!, "long enough");
    await userEvent.type(repeat!, "long enougg");
    expect(screen.getByText("The two passwords are different.")).toBeInTheDocument();
    await userEvent.clear(repeat!);
    await userEvent.type(repeat!, "long enough");
    await userEvent.click(save);

    expect(auth.changePassword).toHaveBeenCalledWith("long enough");
  });

  it("shows Supabase's reason when the password is refused", async () => {
    auth.changePassword.mockResolvedValue("Password should be at least 10 characters");
    renderApp();
    const [password, repeat] = await screen.findAllByLabelText(/New password|Repeat it/);

    await userEvent.type(password!, "long enough");
    await userEvent.type(repeat!, "long enough");
    await userEvent.click(screen.getByRole("button", { name: "Save password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Password should be at least 10 characters",
    );
  });
});

describe("arrivalReason", () => {
  it("reads an invite or reset from the hash or the query, and nothing else", () => {
    const reasons = [
      arrivalReason({ hash: "#access_token=x&type=invite", search: "" }),
      arrivalReason({ hash: "", search: "?type=recovery" }),
      arrivalReason({ hash: "#access_token=x&type=magiclink", search: "" }),
      arrivalReason({ hash: "", search: "" }),
    ];

    expect(reasons).toEqual(["invite", "recovery", null, null]);
  });
});
