// Copy every scored call's result into a CRM: score, QA flag and breaches,
// keyed by the call, so running it again updates rather than duplicates.
//
//   LATTE_URL=... LATTE_API_KEY=latte_... pnpm --filter @scc/examples crm-sync
//
// The CRM here prints what it would write; replace consoleCrm with your CRM's
// client. For updates as they happen, use the webhook receiver instead of
// polling. Scope: calls:read.
import process from "node:process";

import type { CallList, LatteClient } from "@latte/sdk";

import { latteFromEnv } from "./client.ts";

/** What a CRM activity gets from one scored call. */
export interface CrmActivity {
  /** Your own id for the call, as you named the upload. */
  externalId: string;
  latteCallId: string;
  callDate: string;
  agent: string;
  score: number | null;
  needsReview: boolean | null;
  breaches: number;
}

export interface Crm {
  upsertActivity(activity: CrmActivity): Promise<void>;
}

/** toActivity maps one call; the upload's file name (without extension) is the CRM's id for it. */
export function toActivity(call: CallList["items"][number]): CrmActivity {
  return {
    externalId: call.originalFilename.replace(/\.[^.]+$/, ""),
    latteCallId: call.id,
    callDate: call.callDate,
    agent: call.agentName,
    score: call.overallScore,
    needsReview: call.needsReview,
    breaches: call.breaches,
  };
}

/** syncScoredCalls walks every scored call with the cursor (stable while new calls arrive) and upserts each. */
export async function syncScoredCalls(latte: LatteClient, crm: Crm): Promise<number> {
  let synced = 0;
  let cursor: string | undefined;
  do {
    const page = await latte.calls.list({ status: "scored", limit: 100, cursor });
    for (const call of page.items) {
      await crm.upsertActivity(toActivity(call));
      synced += 1;
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return synced;
}

export const consoleCrm: Crm = {
  upsertActivity: (a) => {
    process.stdout.write(
      `${a.externalId}: score ${String(a.score)}, review ${String(a.needsReview)}, breaches ${String(a.breaches)}\n`,
    );
    return Promise.resolve();
  },
};

/** main: the command line. */
export async function main(
  latte: () => LatteClient = latteFromEnv,
  crm: Crm = consoleCrm,
): Promise<void> {
  const synced = await syncScoredCalls(latte(), crm);
  process.stdout.write(`${String(synced)} calls synced\n`);
}

if (import.meta.main) await main();
