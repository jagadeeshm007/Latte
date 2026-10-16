import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";

import { HomeRedirect } from "@/app/HomeRedirect";
import { NotFound } from "@/app/NotFound";
import {
  ApiKeyPage,
  BatchDetailPage,
  BatchesPage,
  CallDetailPage,
  CallsPage,
  DashboardPage,
  DevelopersPage,
  PerformancePage,
  QueuePage,
  RubricPage,
  ScorecardPage,
  UploadPage,
} from "@/app/pages";
import { RootLayout } from "@/app/RootLayout";
import { RouteError } from "@/app/RouteError";
import { Loading } from "@/components/states";
import { callsSearchSchema } from "@/features/calls/calls-search";
import { performanceSearchSchema } from "@/features/manager/performance-search";

// Code-based routes. Access is enforced by the API on every request; the
// menu in RootLayout only hides what a role cannot use.
interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
});

const child = { getParentRoute: () => rootRoute };

const homeRoute = createRoute({ ...child, path: "/", component: HomeRedirect });
const queueRoute = createRoute({ ...child, path: "/queue", component: () => <QueuePage /> });
const callsRoute = createRoute({
  ...child,
  path: "/calls",
  validateSearch: callsSearchSchema,
  component: function CallsRoute() {
    const search = callsRoute.useSearch();
    const navigate = callsRoute.useNavigate();
    return (
      <CallsPage
        search={search}
        onSearch={(next) => {
          // Filters replace the history entry: the back button leaves the page, not each keystroke.
          void navigate({ search: next, replace: true });
        }}
      />
    );
  },
});
const uploadRoute = createRoute({ ...child, path: "/upload", component: () => <UploadPage /> });
const scorecardRoute = createRoute({
  ...child,
  path: "/scorecard",
  component: () => <ScorecardPage agentId="me" />,
});
const dashboardRoute = createRoute({
  ...child,
  path: "/dashboard",
  component: () => <DashboardPage />,
});
const performanceRoute = createRoute({
  ...child,
  path: "/performance",
  validateSearch: performanceSearchSchema,
  component: function PerformanceRoute() {
    const search = performanceRoute.useSearch();
    const navigate = performanceRoute.useNavigate();
    return (
      <PerformancePage
        search={search}
        onSearch={(next) => {
          void navigate({ search: next, replace: true });
        }}
      />
    );
  },
});
const batchesRoute = createRoute({
  ...child,
  path: "/batches",
  component: () => <BatchesPage />,
});
const batchRoute = createRoute({
  ...child,
  path: "/batches/$batchId",
  component: function BatchRoute() {
    const { batchId } = batchRoute.useParams();
    // key: another batch starts with its own page and dialogs.
    return <BatchDetailPage key={batchId} batchId={batchId} />;
  },
});
const developersRoute = createRoute({
  ...child,
  path: "/developers",
  component: () => <DevelopersPage />,
});
const apiKeyRoute = createRoute({
  ...child,
  path: "/developers/$keyId",
  component: function ApiKeyRoute() {
    const { keyId } = apiKeyRoute.useParams();
    return <ApiKeyPage key={keyId} keyId={keyId} />;
  },
});
const rubricRoute = createRoute({ ...child, path: "/rubric", component: () => <RubricPage /> });

const callRoute = createRoute({
  ...child,
  path: "/calls/$callId",
  component: function CallRoute() {
    const { callId } = callRoute.useParams();
    return <CallDetailPage callId={callId} />;
  },
});

const agentRoute = createRoute({
  ...child,
  path: "/agents/$agentId",
  component: function AgentRoute() {
    const { agentId } = agentRoute.useParams();
    return <ScorecardPage key={agentId} agentId={agentId} />;
  },
});

export const routeTree = rootRoute.addChildren([
  homeRoute,
  queueRoute,
  callsRoute,
  callRoute,
  uploadRoute,
  scorecardRoute,
  agentRoute,
  dashboardRoute,
  performanceRoute,
  batchesRoute,
  batchRoute,
  developersRoute,
  apiKeyRoute,
  rubricRoute,
]);

interface AppRouterOptions {
  queryClient: QueryClient;
  /** Memory history for tests; browser history by default. */
  history?: RouterHistory;
}

export function createAppRouter({ queryClient, history }: AppRouterOptions) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultErrorComponent: RouteError,
    defaultPendingComponent: () => <Loading label="Loading the page" />,
    scrollRestoration: true,
    ...(history ? { history } : {}),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
