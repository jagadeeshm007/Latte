import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyTheme, readTheme, setTheme, THEME_KEY, useTheme } from "./theme";

function mockSystemDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: dark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

// Node 24's own localStorage shadows jsdom's and is empty without a file, so give each test a map.
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => {
      data.delete(k);
    },
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
  vi.unstubAllGlobals();
});

describe("theme", () => {
  it("falls back to the system theme when storage is blocked", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readTheme()).toBe("system");
    expect(() => {
      setTheme("dark");
    }).not.toThrow();
  });

  it("defaults to the system theme and ignores a stored value it does not know", () => {
    expect(readTheme()).toBe("system");
    localStorage.setItem(THEME_KEY, "sepia");
    expect(readTheme()).toBe("system");
  });

  it("persists the choice and sets .dark on <html>", () => {
    mockSystemDark(false);
    const { result } = renderHook(() => useTheme());
    act(() => {
      setTheme("dark");
    });
    expect(result.current).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");

    act(() => {
      setTheme("light");
    });
    expect(result.current).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("follows the OS when set to system", () => {
    mockSystemDark(true);
    applyTheme("system");
    expect(document.documentElement).toHaveClass("dark");
    mockSystemDark(false);
    applyTheme("system");
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
