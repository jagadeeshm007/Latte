import { describe, expect, it } from "vitest";

import { Limiter } from "./limiter.ts";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("Limiter", () => {
  it("lets a model with no limits through", () => {
    const limiter = new Limiter({});

    expect(limiter.reserve("m", { tokens: 10_000 })).toBe(0);
  });

  it("waits when the tokens a minute would pass the limit", () => {
    const c = clock();
    const limiter = new Limiter({ m: { tpm: 8000 } }, c.now);
    limiter.reserve("m", { tokens: 5000 });
    c.advance(10_000);

    const wait = limiter.reserve("m", { tokens: 5000 });

    expect(wait).toBe(50_000);
  });

  it("lets the first call through even when it alone exceeds the tokens a minute", () => {
    const limiter = new Limiter({ m: { tpm: 1000 } });

    expect(limiter.reserve("m", { tokens: 5000 })).toBe(0);
  });

  it("waits when the audio seconds an hour would pass the limit", () => {
    const c = clock();
    const limiter = new Limiter({ w: { audioSecondsPerHour: 7200 } }, c.now);
    limiter.reserve("w", { audioSeconds: 7000 });
    c.advance(60_000);

    const wait = limiter.reserve("w", { audioSeconds: 400 });

    expect(wait).toBe(3_540_000);
  });

  it("frees room once the window has passed", () => {
    const c = clock();
    const limiter = new Limiter({ m: { rpm: 1 } }, c.now);
    limiter.reserve("m", {});
    c.advance(60_000);

    expect(limiter.reserve("m", {})).toBe(0);
  });

  it("holds a blocked model until the block expires", () => {
    const c = clock();
    const limiter = new Limiter({}, c.now);
    limiter.block("m", 5000);

    expect(limiter.reserve("m", {})).toBe(5000);
    c.advance(5000);
    expect(limiter.reserve("m", {})).toBe(0);
  });
});
