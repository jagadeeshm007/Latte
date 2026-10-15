import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";

import { HomeRedirect } from "@/app/HomeRedirect";
import { NotFound } from "@/app/NotFound";
import { RootLayout } from "@/app/RootLayout";
import { RouteError } from "@/app/RouteError";
import { CallDetailPage } from "@/features/calls/CallDetailPage";
import { CallsPage, QueuePage } from "@/features/calls/CallsPage";
import { UploadPage } from "@/features/calls/UploadPage";
import { ScorecardPage } from "@/features/coaching/ScorecardPage";
import { DashboardPage } from "@/features/manager/DashboardPage";
import { RubricPage } from "@/features/manager/RubricPage";

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
const queueRoute = createRoute({ ...child, path: "/queue", component: QueuePage });
const callsRoute = createRoute({ ...child, path: "/calls", component: CallsPage });
const uploadRoute = createRoute({ ...child, path: "/upload", component: UploadPage });
const scorecardRoute = createRoute({
  ...child,
  path: "/scorecard",
  component: () => <ScorecardPage agentId="me" />,
});
const dashboardRoute = createRoute({ ...child, path: "/dashboard", component: DashboardPage });
const rubricRoute = createRoute({ ...child, path: "/rubric", component: RubricPage });

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
    scrollRestoration: true,
    ...(history ? { history } : {}),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
