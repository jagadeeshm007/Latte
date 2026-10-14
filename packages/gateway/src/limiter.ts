// A per-process limiter: requests a minute, tokens a minute and audio seconds
// an hour per model. With N processes, configure each with the plan limit
// divided by N (HLD section 8). It never sleeps: reserve() says how long to
// wait and the caller reschedules its job.

export interface ModelLimits {
  rpm?: number;
  tpm?: number;
  audioSecondsPerHour?: number;
}

interface Entry {
  at: number;
  tokens: number;
  audioSeconds: number;
}

const MINUTE = 60_000;
const HOUR = 3_600_000;

export class Limiter {
  private readonly log = new Map<string, Entry[]>();
  private readonly blockedUntil = new Map<string, number>();

  constructor(
    private readonly limits: Record<string, ModelLimits>,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * reserve records the use and returns 0, or returns the milliseconds to wait
   * and records nothing.
   */
  reserve(model: string, use: { tokens?: number; audioSeconds?: number }): number {
    const t = this.now();
    const blocked = (this.blockedUntil.get(model) ?? 0) - t;
    if (blocked > 0) {
      return blocked;
    }
    const limit = this.limits[model];
    const entries = (this.log.get(model) ?? []).filter((e) => t - e.at < HOUR);
    this.log.set(model, entries);
    if (limit) {
      const lastMinute = entries.filter((e) => t - e.at < MINUTE);
      const waitFor = (window: Entry[], span: number) => (window[0] ? window[0].at + span - t : 0);
      if (limit.rpm !== undefined && lastMinute.length + 1 > limit.rpm) {
        return Math.max(1, waitFor(lastMinute, MINUTE));
      }
      const tokens = use.tokens ?? 0;
      if (limit.tpm !== undefined && tokens > 0) {
        const used = lastMinute.reduce((s, e) => s + e.tokens, 0);
        if (used + tokens > limit.tpm && lastMinute.length > 0) {
          return Math.max(1, waitFor(lastMinute, MINUTE));
        }
      }
      const audio = use.audioSeconds ?? 0;
      if (limit.audioSecondsPerHour !== undefined && audio > 0) {
        const used = entries.reduce((s, e) => s + e.audioSeconds, 0);
        if (used + audio > limit.audioSecondsPerHour && entries.length > 0) {
          return Math.max(1, waitFor(entries, HOUR));
        }
      }
    }
    entries.push({ at: t, tokens: use.tokens ?? 0, audioSeconds: use.audioSeconds ?? 0 });
    return 0;
  }

  /** block stops every reservation on a model until the provider's retry-after has passed. */
  block(model: string, waitMs: number): void {
    this.blockedUntil.set(model, this.now() + waitMs);
  }
}
