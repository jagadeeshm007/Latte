import { DASHBOARD_GROUPS, LEADERBOARD_SORTS } from "@scc/shared";
import { z } from "zod";

import { RANGE_KEYS } from "./date-range";

// The performance page keeps its state in the URL, so a view can be shared or
// bookmarked. Each field is parsed on its own: one bad value drops only itself.

export const PERFORMANCE_PAGE_SIZE = 25;

export const performanceSearchSchema = z.object({
  by: z.enum(DASHBOARD_GROUPS).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  sort: z.enum(LEADERBOARD_SORTS).optional().catch(undefined),
  dir: z.enum(["asc", "desc"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
  range: z.enum(RANGE_KEYS).optional().catch(undefined),
  min: z.coerce.number().int().min(0).max(10_000).optional().catch(undefined),
});
export type PerformanceSearch = z.infer<typeof performanceSearchSchema>;
