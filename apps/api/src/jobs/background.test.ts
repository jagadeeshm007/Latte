import { describe, expect, it, vi } from "vitest";

import { backgroundDrain, type BackgroundDrainDeps } from "./background.ts";

// The drain behind processing on upload (ADR-0029), driven by fakes.

function setup(overrides: Partial<BackgroundDrainDeps> = {}) {
  const kept: Promise<unknown>[] = [];
  const budgets: number[] = [];
  const release: (() => void)[] = [];
  const deps: BackgroundDrainDeps = {
    drain: vi.fn((ms: number) => {
      budgets.push(ms);
      return new Promise<Record<string, unknown>>((resolve) => {
        release.push(() => {
          resolve({ completed: 1 });
        });
      });
    }),
    waitUntil: (p) => kept.push(p),
    deadline: () => undefined,
    fallbackBudgetMs: 240_000,
    marginMs: 60_000,
    log: { info: vi.fn(), error: vi.fn() },
    now: () => 1_000_000,
    ...overrides,
  };
  return { kick: backgroundDrain(deps), deps, kept, budgets, release };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("backgroundDrain", () => {
  it("drains after the response and keeps the invocation alive until it ends", async () => {
    const { kick, kept, budgets, release } = setup();

    kick();
    await settle();
    release[0]?.();
    await Promise.all(kept);

    expect(budgets).toEqual([240_000]);
    expect(kept).toHaveLength(1);
  });

  it("runs one drain at a time and goes round again for work queued meanwhile", async () => {
    const { kick, deps, kept, release } = setup();

    kick();
    kick();
    kick();
    await settle();
    release[0]?.();
    await settle();
    release[1]?.();
    await Promise.all(kept);

    expect(deps.drain).toHaveBeenCalledTimes(2);
    expect(kept).toHaveLength(3);
  });

  it("budgets by the platform's deadline, keeping the margin back", async () => {
    const { kick, kept, budgets, release } = setup({
      deadline: () => new Date(1_000_000 + 300_000),
    });

    kick();
    await settle();
    release[0]?.();
    await Promise.all(kept);

    expect(budgets).toEqual([240_000]);
  });

  it("does not start when the deadline leaves no time", async () => {
    const { kick, deps, kept } = setup({ deadline: () => new Date(1_000_000 + 30_000) });

    kick();
    await Promise.all(kept);

    expect(deps.drain).not.toHaveBeenCalled();
  });

  it("logs a failed drain and accepts the next kick", async () => {
    const drain = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce({});
    const { kick, deps, kept } = setup({ drain });

    kick();
    await Promise.all(kept);
    kick();
    await Promise.all(kept);

    expect(deps.log.error).toHaveBeenCalledOnce();
    expect(drain).toHaveBeenCalledTimes(2);
  });
});
