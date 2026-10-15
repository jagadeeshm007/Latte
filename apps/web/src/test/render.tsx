import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";

/** createTestQueryClient never retries, so an error state is reached at once. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
}

/** renderWithProviders renders ui inside a fresh QueryClientProvider. */
export function renderWithProviders(ui: ReactNode): RenderResult & { client: QueryClient } {
  const client = createTestQueryClient();
  const result = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...result, client };
}

/** jsonResponse builds a Response the way the API would answer. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * renderInRouter renders ui as the only route of a memory router, so Links
 * and route hooks work, inside a fresh query client.
 */
export async function renderInRouter(
  ui: ReactNode,
  path = "/",
): Promise<RenderResult & { client: QueryClient }> {
  const { createMemoryHistory, createRootRoute, createRouter, RouterProvider } =
    await import("@tanstack/react-router");
  const client = createTestQueryClient();
  const rootRoute = createRootRoute({ component: () => ui });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  const result = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, client };
}
