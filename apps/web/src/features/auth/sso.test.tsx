import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

// The sign-in options come from VITE_AUTH_PROVIDERS, read once at load: set it here.
vi.mock("@/lib/env", () => ({
  env: {
    VITE_API_URL: "http://api.test",
    VITE_SUPABASE_URL: "http://supabase.test",
    VITE_SUPABASE_PUBLISHABLE_KEY: "k",
    VITE_AUTH_PROVIDERS: ["google", "azure", "saml"],
  },
}));
const signInWithProvider = vi.fn(() => Promise.resolve(null));
const signInWithSso = vi.fn(() => Promise.resolve("No SSO provider for that domain"));
vi.mock("./session", () => ({
  signIn: vi.fn(() => Promise.resolve(null)),
  signInWithProvider,
  signInWithSso,
}));

const { SignInPage } = await import("./SignInPage");

describe("single sign-on (ADR-0024)", () => {
  it("offers the providers that are set up, and says sign-in is invite-only", async () => {
    renderWithProviders(<SignInPage />);

    await userEvent.click(screen.getByRole("button", { name: "Continue with Microsoft" }));

    expect(signInWithProvider).toHaveBeenCalledWith("azure");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByText("Only people a manager has invited can sign in.")).toBeInTheDocument();
  });

  it("finds the company's SAML sign-in from the email typed, and shows why it failed", async () => {
    renderWithProviders(<SignInPage />);

    await userEvent.type(screen.getByLabelText("Email"), "neha@acme.example");
    await userEvent.click(screen.getByRole("button", { name: /Sign in with your company/ }));

    expect(signInWithSso).toHaveBeenCalledWith("neha@acme.example");
    expect(await screen.findByText("No SSO provider for that domain")).toBeInTheDocument();
  });
});
