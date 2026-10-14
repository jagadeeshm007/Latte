import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

function Bomb({ explode }: { explode: boolean }) {
  if (explode) {
    throw new Error("kaboom");
  }
  return <p>fine</p>;
}

describe("ErrorBoundary", () => {
  it("renders the children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("shows the default fallback with the message, reports once, and resets", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onError = vi.fn();
    let explode = true;
    function Toggle() {
      return <Bomb explode={explode} />;
    }
    const user = userEvent.setup();

    render(
      <ErrorBoundary onError={onError}>
        <Toggle />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("kaboom");
    expect(onError).toHaveBeenCalledTimes(1);
    explode = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("renders a custom fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary fallback={(error) => <p>custom: {error.message}</p>}>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText("custom: kaboom")).toBeInTheDocument();
  });

  it("wraps a non-Error throw", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function ThrowString(): never {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- the boundary must survive legacy code that throws strings
      throw "plain string";
    }

    render(
      <ErrorBoundary>
        <ThrowString />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("plain string");
  });
});
