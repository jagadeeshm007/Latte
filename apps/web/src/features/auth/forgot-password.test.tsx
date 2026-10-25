import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderInRouter } from "@/test/render";

// SCC-7-1: a forgotten password is reset from the sign-in page, without
// saying whether an account exists for the email.

const requestPasswordReset = vi.fn<(email: string) => Promise<string | null>>();
vi.mock("./session", () => ({
  signIn: vi.fn(() => Promise.resolve(null)),
  signInWithProvider: vi.fn(),
  signInWithSso: vi.fn(),
  requestPasswordReset,
}));

const { SignInPage } = await import("./SignInPage");

beforeEach(() => {
  requestPasswordReset.mockReset();
  requestPasswordReset.mockResolvedValue(null);
});

describe("forgot password", () => {
  it("sends a reset link to the email already typed and says so without confirming the account", async () => {
    await renderInRouter(<SignInPage />);
    await userEvent.type(screen.getByLabelText("Email"), "  neha@example.com ");

    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(requestPasswordReset).toHaveBeenCalledWith("neha@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account exists for neha@example.com, we sent a link to reset its password.",
    );
  });

  it("asks for an email before sending anything", async () => {
    await renderInRouter(<SignInPage />);

    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(requestPasswordReset).not.toHaveBeenCalled();
    expect(screen.getByText("Enter the email you were invited with.")).toBeInTheDocument();
  });

  it("shows why the link could not be sent", async () => {
    requestPasswordReset.mockResolvedValue("Email rate limit exceeded");
    await renderInRouter(<SignInPage />);
    await userEvent.type(screen.getByLabelText("Email"), "neha@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("Email rate limit exceeded")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("goes back to signing in", async () => {
    await renderInRouter(<SignInPage />);

    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await userEvent.click(screen.getByRole("button", { name: "Back to sign in" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
