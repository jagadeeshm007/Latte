import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Navigate,
  useRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { HomeRedirect } from "@/app/HomeRedirect";
import { NotFound } from "@/app/NotFound";
import {
  AlertsPage,
  ApiKeyPage,
  BatchDetailPage,
  BillingPage,
  BatchesPage,
  CallDetailPage,
  CallsPage,
  DashboardPage,
  DevelopersPage,
  DocsPage,
  LandingPage,
  MembersPage,
  NotificationsPage,
  PerformancePage,
  QueuePage,
  RubricPage,
  ScorecardPage,
  SettingsPage,
  StatusPage,
  TeamsPage,
  UploadPage,
  WebhookPage,
} from "@/app/pages";
import { safeNext } from "@/app/public-paths";
import { RootLayout } from "@/app/RootLayout";
import { RouteError } from "@/app/RouteError";
import { Loading } from "@/components/states";
import { useSession } from "@/features/auth/session";
import { SignInPage } from "@/features/auth/SignInPage";
import { callsSearchSchema } from "@/features/calls/calls-search";
import { performanceSearchSchema } from "@/features/manager/performance-search";
import { settingsSearchSchema } from "@/features/settings/settings-search";

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

const homeRoute = createRoute({
  ...child,
  path: "/",
  // Signed in, each role goes to its own home; signed out, the landing page.
  component: function HomeRoute() {
    return useSession().status === "signed_in" ? <HomeRedirect /> : <LandingPage />;
  },
});
const signInRoute = createRoute({
  ...child,
  path: "/sign-in",
  validateSearch: z.object({ next: z.string().optional().catch(undefined) }),
  component: function SignInRoute() {
    const { next } = signInRoute.useSearch();
    const session = useSession();
    const router = useRouter();
    const signedIn = session.status === "signed_in";
    useEffect(() => {
      if (signedIn) router.history.replace(safeNext(next));
    }, [signedIn, next, router]);
    return signedIn ? <Loading shape="app" /> : <SignInPage />;
  },
});
const legalIndexRoute = createRoute({
  ...child,
  path: "/legal",
  component: () => <DocsPage folder="legal" slug="terms" />,
});
const legalPageRoute = createRoute({
  ...child,
  path: "/legal/$page",
  component: function LegalPageRoute() {
    const { page } = legalPageRoute.useParams();
    return <DocsPage key={page} folder="legal" slug={page} />;
  },
});
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
// The docs moved to the public /docs; old links to the in-app page land there.
const oldDocsRoute = createRoute({
  ...child,
  path: "/developers/docs",
  component: () => <Navigate to="/docs" replace />,
});
const docsIndexRoute = createRoute({
  ...child,
  path: "/docs",
  component: () => <DocsPage slug="index" />,
});
const docsPageRoute = createRoute({
  ...child,
  path: "/docs/$page",
  component: function DocsPageRoute() {
    const { page } = docsPageRoute.useParams();
    return <DocsPage key={page} slug={page} />;
  },
});
const webhookRoute = createRoute({
  ...child,
  path: "/developers/webhooks/$webhookId",
  component: function WebhookRoute() {
    const { webhookId } = webhookRoute.useParams();
    return <WebhookPage key={webhookId} webhookId={webhookId} />;
  },
});
const notificationsRoute = createRoute({
  ...child,
  path: "/notifications",
  component: () => <NotificationsPage />,
});
const alertsRoute = createRoute({ ...child, path: "/alerts", component: () => <AlertsPage /> });
const teamsRoute = createRoute({ ...child, path: "/teams", component: () => <TeamsPage /> });
const membersRoute = createRoute({ ...child, path: "/members", component: () => <MembersPage /> });
const billingRoute = createRoute({ ...child, path: "/billing", component: () => <BillingPage /> });
// Public: RootLayout serves it without a sign-in (ADR-0026).
const settingsRoute = createRoute({
  ...child,
  path: "/settings",
  validateSearch: settingsSearchSchema,
  component: function SettingsRoute() {
    const { tab } = settingsRoute.useSearch();
    const navigate = settingsRoute.useNavigate();
    return (
      <SettingsPage
        tab={tab}
        onTab={(next) => {
          void navigate({ search: { tab: next }, replace: true });
        }}
      />
    );
  },
});
const statusRoute = createRoute({ ...child, path: "/status", component: () => <StatusPage /> });
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
  signInRoute,
  legalIndexRoute,
  legalPageRoute,
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
  settingsRoute,
  oldDocsRoute,
  docsIndexRoute,
  docsPageRoute,
  webhookRoute,
  notificationsRoute,
  alertsRoute,
  teamsRoute,
  membersRoute,
  billingRoute,
  statusRoute,
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
