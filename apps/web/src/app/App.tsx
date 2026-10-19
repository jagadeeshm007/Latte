import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { RouterProvider, type RouterHistory } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { useState } from "react";

import { createAppRouter } from "@/app/routes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/toast";
import { pageViewOnly } from "@/lib/analytics";
import { queryClient as defaultQueryClient } from "@/lib/query-client";

interface AppProps {
  /** Tests pass a fresh client with retry off and a memory history. */
  queryClient?: QueryClient;
  history?: RouterHistory;
}

/**
 * App owns the providers: the error boundary of last resort, the query
 * cache and the router. Route errors stop at RouteError inside the layout;
 * anything that escapes the router lands here. Vercel Web Analytics counts
 * page views, without query strings or record ids (lib/analytics.ts).
 */
export function App({ queryClient = defaultQueryClient, history }: AppProps) {
  const [router] = useState(() =>
    createAppRouter(history ? { queryClient, history } : { queryClient }),
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
        <Analytics beforeSend={pageViewOnly} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
