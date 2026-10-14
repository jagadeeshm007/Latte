import { randomUUID } from "node:crypto";

import type { ModelCallRow, UsageStore } from "./gateway.ts";

/** MemoryUsageStore keeps rows in memory: tests and the offline eval use it. */
export class MemoryUsageStore implements UsageStore {
  readonly rows: (ModelCallRow & { id: string; at: Date })[] = [];

  constructor(private readonly startingSpendUsd = 0) {}

  monthSpendUsd(): Promise<number> {
    return Promise.resolve(this.startingSpendUsd + this.rows.reduce((s, r) => s + r.costUsd, 0));
  }

  record(row: ModelCallRow): Promise<string> {
    const id = randomUUID();
    this.rows.push({ ...row, id, at: new Date() });
    return Promise.resolve(id);
  }
}
