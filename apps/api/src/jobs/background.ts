import type { Logger } from "pino";

// Processing right after an upload on Vercel (ADR-0029): the request that
// queued a job keeps its function alive with waitUntil and drains the queue
// after the response is sent. One drain runs per instance; work queued while
// it runs makes it go round once more instead of starting a second one.

export interface BackgroundDrainDeps {
  /** Runs the queues for at most budgetMs. */
  drain: (budgetMs: number) => Promise<Record<string, unknown>>;
  /** Keeps the invocation alive for the promise (Vercel's waitUntil; a no-op elsewhere). */
  waitUntil: (promise: Promise<unknown>) => void;
  /** When the platform stops this invocation, if it says. */
  deadline: () => Date | undefined;
  /** The budget when there is no deadline to go by. */
  fallbackBudgetMs: number;
  /** Time kept back for the job in hand to finish. */
  marginMs: number;
  log: Pick<Logger, "info" | "error">;
  now?: () => number;
}

/** backgroundDrain returns kick(): start draining after this response, or extend the one running. */
export function backgroundDrain(deps: BackgroundDrainDeps): () => void {
  const now = deps.now ?? Date.now;
  const state: { running: Promise<void> | null; again: boolean } = { running: null, again: false };

  const budget = () => {
    const deadline = deps.deadline();
    return deadline ? deadline.getTime() - now() - deps.marginMs : deps.fallbackBudgetMs;
  };

  /** Whether work arrived during the last pass; reading it clears it. */
  const consumeAgain = () => {
    const again = state.again;
    state.again = false;
    return again;
  };

  const loop = async () => {
    for (let pass = true; pass; pass = consumeAgain()) {
      const ms = budget();
      if (ms <= 0) {
        deps.log.info("background drain: no time left; the next scheduled run picks up");
        return;
      }
      const summary = await deps.drain(ms);
      deps.log.info({ ...summary, budgetMs: ms }, "background drain finished");
    }
  };

  return () => {
    if (state.running) {
      state.again = true;
    } else {
      state.running = loop()
        .catch((error: unknown) => {
          deps.log.error({ err: error }, "background drain failed");
        })
        .finally(() => {
          state.running = null;
        });
    }
    // Every request that queued work keeps the instance alive until the drain ends.
    deps.waitUntil(state.running);
  };
}
