import { useState } from "react";

import type { PerformanceSearch } from "@/features/manager/performance-search";
import { PerformancePage } from "@/features/manager/PerformancePage";

/** StatefulPerformancePage stands in for the route in tests: it keeps the URL state in memory. */
export function StatefulPerformancePage({ initial = {} }: { initial?: PerformanceSearch }) {
  const [search, setSearch] = useState<PerformanceSearch>(initial);
  return <PerformancePage search={search} onSearch={setSearch} />;
}
