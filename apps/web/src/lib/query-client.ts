import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

/** createQueryClient builds the app's client; tests build their own with retry off. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // A 4xx will not change on retry; one retry covers a blip elsewhere.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  });
}

export const queryClient = createQueryClient();
