import { useState } from "react";

import type { CallsSearch } from "@/features/calls/calls-search";
import { CallsPage } from "@/features/calls/CallsPage";

/** StatefulCallsPage stands in for the route in tests: it keeps the URL state in memory. */
export function StatefulCallsPage({ initial = {} }: { initial?: CallsSearch }) {
  const [search, setSearch] = useState<CallsSearch>(initial);
  return <CallsPage search={search} onSearch={setSearch} />;
}
