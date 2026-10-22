import { createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { server } from "@/test/msw";
import { createTestQueryClient, renderInRouter } from "@/test/render";

import { settingsSearchSchema } from "./settings-search";
import { SettingsPage } from "./SettingsPage";

// SCC-2-6: a person's own settings, and where they sit in the sidebar.

const auth = vi.hoisted(() => ({
  changePassword: vi.fn<(password: string) => Promise<string | null>>(),
  signOutEverywhere: vi.fn<() => Promise<void>>(),
  session: { status: "signed_in", userId: "u1", email: "ravi@example.com" },
}));
vi.mock("@/features/auth/session", () => ({
  useSession: () => auth.session,
  signIn: vi.fn(),
  signOut: vi.fn(),
  changePassword: auth.changePassword,
  signOutEverywhere: auth.signOutEverywhere,
}));

const me = (role: "agent" | "manager" | "qa_reviewer" = "agent", displayName = "Ravi") => ({
  id: "u1",
  email: "ravi@example.com",
  displayName,
  role,
  agentId: role === "agent" ? "a1" : null,
});

beforeEach(() => {
  auth.changePassword.mockResolvedValue(null);
  auth.signOutEverywhere.mockResolvedValue();
  server.use(http.get("*/api/me", () => HttpResponse.json(me())));
});

describe("settings: profile", () => {
  it("shows email and role read-only and saves a new name", async () => {
    const sent: unknown[] = [];
    server.use(
      http.patch("*/api/me", async ({ request }) => {
        const body = (await request.json()) as { displayName: string };
        sent.push(body);
        return HttpResponse.json(me("agent", body.displayName));
      }),
    );
    await renderInRouter(<SettingsPage onTab={vi.fn()} />);

    const name = await screen.findByRole("textbox", { name: "Name" });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByText("ravi@example.com")).toBeInTheDocument();
    expect(screen.getByText("Sales agent")).toBeInTheDocument();
    await userEvent.clear(name);
    await userEvent.type(name, "Ravi Kumar");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(sent).toEqual([{ displayName: "Ravi Kumar" }]);
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });
    expect(name).toHaveValue("Ravi Kumar");
  });

  it("shows why a name was refused", async () => {
    server.use(
      http.patch("*/api/me", () =>
        HttpResponse.json(
          { error: { code: "validation_error", message: "name is too long" } },
          { status: 400 },
        ),
      ),
    );
    await renderInRouter(<SettingsPage onTab={vi.fn()} />);

    await userEvent.type(await screen.findByRole("textbox", { name: "Name" }), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("name is too long");
  });
});

describe("settings: security", () => {
  it("changes the password only when it is long enough and repeated", async () => {
    await renderInRouter(<SettingsPage tab="security" onTab={vi.fn()} />);

    const [password, repeat] = await screen.findAllByLabelText(/password|Repeat it/i, {
      selector: "input",
    });
    const change = screen.getByRole("button", { name: "Change password" });
    await userEvent.type(password!, "short");
    expect(change).toBeDisabled();
    await userEvent.type(password!, "-but-long");
    await userEvent.type(repeat!, "different");
    expect(screen.getByText("The two passwords are different.")).toBeInTheDocument();
    expect(change).toBeDisabled();
    await userEvent.clear(repeat!);
    await userEvent.type(repeat!, "short-but-long");
    await userEvent.click(change);

    await waitFor(() => {
      expect(auth.changePassword).toHaveBeenCalledWith("short-but-long");
    });
    await waitFor(() => {
      expect(password).toHaveValue("");
    });
    expect(repeat).toHaveValue("");
  });

  it("shows Supabase's reason when the password is refused", async () => {
    auth.changePassword.mockResolvedValue("Password should be at least 10 characters");
    await renderInRouter(<SettingsPage tab="security" onTab={vi.fn()} />);

    const [password, repeat] = await screen.findAllByLabelText(/password|Repeat it/i, {
      selector: "input",
    });
    await userEvent.type(password!, "abcdefgh");
    await userEvent.type(repeat!, "abcdefgh");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("at least 10 characters");
  });

  it("asks before signing out everywhere, and can be cancelled", async () => {
    await renderInRouter(<SettingsPage tab="security" onTab={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Sign out everywhere" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(auth.signOutEverywhere).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, sign out everywhere" }));

    await waitFor(() => {
      expect(auth.signOutEverywhere).toHaveBeenCalledTimes(1);
    });
  });
});

describe("settings: tabs", () => {
  it("sets the digest under Notifications and the theme under Appearance", async () => {
    const digests: unknown[] = [];
    server.use(
      http.get("*/api/digest", () => HttpResponse.json({ frequency: "off" })),
      http.put("*/api/digest", async ({ request }) => {
        digests.push(await request.json());
        return HttpResponse.json({ frequency: "weekly" });
      }),
    );
    const onTab = vi.fn();
    await renderInRouter(<SettingsPage tab="notifications" onTab={onTab} />);

    await userEvent.click(await screen.findByRole("button", { name: "Weekly" }));
    await waitFor(() => {
      expect(digests).toEqual([{ frequency: "weekly" }]);
    });
    await userEvent.click(screen.getByRole("tab", { name: "Appearance" }));
    expect(onTab).toHaveBeenCalledWith("appearance");
  });

  it("shows the theme choice under Appearance", async () => {
    await renderInRouter(<SettingsPage tab="appearance" onTab={vi.fn()} />);

    expect(await screen.findByRole("group", { name: "Colour theme" })).toBeInTheDocument();
  });

  it("opens the profile for a missing or unknown tab in the URL", () => {
    expect(settingsSearchSchema.parse({})).toEqual({ tab: undefined });
    expect(settingsSearchSchema.parse({ tab: "billing" })).toEqual({ tab: undefined });
    expect(settingsSearchSchema.parse({ tab: "security" })).toEqual({ tab: "security" });
  });

  it("says when the account cannot be loaded", async () => {
    server.use(http.get("*/api/me", () => new HttpResponse(null, { status: 500 })));

    await renderInRouter(<SettingsPage onTab={vi.fn()} />);

    expect(await screen.findByText("Your settings could not be loaded")).toBeInTheDocument();
  });
});

describe("settings in the sidebar", () => {
  function renderApp(path: string) {
    return render(
      <App
        queryClient={createTestQueryClient()}
        history={createMemoryHistory({ initialEntries: [path] })}
      />,
    );
  }

  it("gives every role its account settings, and only managers the workspace pages", async () => {
    server.use(
      http.get("*/api/calls", () => HttpResponse.json({ items: [], nextCursor: null, total: 0 })),
    );
    renderApp("/settings?tab=security");

    const nav = within(await screen.findByRole("navigation", { name: "Main" }));
    expect(nav.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/settings");
    expect(nav.queryByRole("link", { name: "Members" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Sign out everywhere" })).toBeInTheDocument();
  });

  it("lists Members, Teams, Billing and Developers under Settings for a manager", async () => {
    server.use(http.get("*/api/me", () => HttpResponse.json(me("manager"))));
    renderApp("/settings");

    const nav = within(await screen.findByRole("navigation", { name: "Main" }));
    const links = nav.getAllByRole("link").map((l) => l.textContent);
    expect(links.slice(links.indexOf("Account"))).toEqual([
      "Account",
      "Members",
      "Teams",
      "Billing",
      "Developers",
    ]);
  });
});
