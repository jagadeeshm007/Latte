import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { RouterProvider, type RouterHistory } from "@tanstack/react-router";
import { useState } from "react";

import { createAppRouter } from "@/app/routes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient as defaultQueryClient } from "@/lib/query-client";

interface AppProps {
  /** Tests pass a fresh client with retry off and a memory history. */
  queryClient?: QueryClient;
  history?: RouterHistory;
}

/**
 * App owns the providers: the error boundary of last resort, the query
 * cache and the router. Route errors stop at RouteError inside the layout;
 * anything that escapes the router lands here.
 */
export function App({ queryClient = defaultQueryClient, history }: AppProps) {
  const [router] = useState(() =>
    createAppRouter(history ? { queryClient, history } : { queryClient }),
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
