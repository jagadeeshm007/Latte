import { beforeEach, describe, expect, it, vi } from "vitest";

import { demoToken, forgetDemo, onDemoChange, rememberDemo } from "./demo-token";

// The demo session's token in sessionStorage (ADR-0033).

const later = (ms: number) => new Date(Date.now() + ms).toISOString();

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("the demo token", () => {
  it("is kept until it expires, then forgotten", () => {
    rememberDemo({ token: "ldemo_live", expiresAt: later(60_000) });
    expect(demoToken()).toBe("ldemo_live");

    rememberDemo({ token: "ldemo_old", expiresAt: later(-1) });
    expect(demoToken()).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("ignores anything stored that is not a demo session", () => {
    window.sessionStorage.setItem("latte.demo", "{not json");
    expect(demoToken()).toBeNull();
    window.sessionStorage.setItem("latte.demo", JSON.stringify({ token: 1 }));
    expect(demoToken()).toBeNull();
  });

  it("tells listeners when a demo starts and ends", () => {
    const listener = vi.fn();
    const stop = onDemoChange(listener);

    rememberDemo({ token: "ldemo_x", expiresAt: later(60_000) });
    forgetDemo();
    stop();
    forgetDemo();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
