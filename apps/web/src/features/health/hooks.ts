import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchHealth } from "./api";

/**
 * Query-key factory. Every key in this feature starts from `all`, and every
 * input the fetch uses appears in the key, so invalidation and caching are
 * exact. A feature with parameters adds `list: (filters) => [...all, "list", filters]`.
 */
export const healthKeys = {
  all: ["health"] as const,
  status: () => [...healthKeys.all, "status"] as const,
};

/** healthQueryOptions is shared by useHealth, route loaders and prefetches. */
export function healthQueryOptions() {
  return queryOptions({
    queryKey: healthKeys.status(),
    queryFn: ({ signal }) => fetchHealth({ signal }),
  });
}

export function useHealth() {
  return useQuery(healthQueryOptions());
}
