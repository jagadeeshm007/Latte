import { lazy } from "react";

// Each page is its own chunk, loaded on first visit (or on hover, with
// preload "intent"); the page skeleton shows while it suspends.
export const CallDetailPage = lazy(() =>
  import("@/features/calls/CallDetailPage").then((m) => ({ default: m.CallDetailPage })),
);
export const CallsPage = lazy(() =>
  import("@/features/calls/CallsPage").then((m) => ({ default: m.CallsPage })),
);
export const QueuePage = lazy(() =>
  import("@/features/calls/CallsPage").then((m) => ({ default: m.QueuePage })),
);
export const UploadPage = lazy(() =>
  import("@/features/calls/UploadPage").then((m) => ({ default: m.UploadPage })),
);
export const ScorecardPage = lazy(() =>
  import("@/features/coaching/ScorecardPage").then((m) => ({ default: m.ScorecardPage })),
);
export const DashboardPage = lazy(() =>
  import("@/features/manager/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
export const RubricPage = lazy(() =>
  import("@/features/manager/RubricPage").then((m) => ({ default: m.RubricPage })),
);
export const PerformancePage = lazy(() =>
  import("@/features/manager/PerformancePage").then((m) => ({ default: m.PerformancePage })),
);
export const BatchesPage = lazy(() =>
  import("@/features/batches/BatchesPage").then((m) => ({ default: m.BatchesPage })),
);
export const BatchDetailPage = lazy(() =>
  import("@/features/batches/BatchDetailPage").then((m) => ({ default: m.BatchDetailPage })),
);
export const DevelopersPage = lazy(() =>
  import("@/features/developers/DevelopersPage").then((m) => ({ default: m.DevelopersPage })),
);
export const ApiKeyPage = lazy(() =>
  import("@/features/developers/ApiKeyPage").then((m) => ({ default: m.ApiKeyPage })),
);
export const WebhookPage = lazy(() =>
  import("@/features/developers/WebhookPage").then((m) => ({ default: m.WebhookPage })),
);
export const DocsPage = lazy(() =>
  import("@/features/docs/DocsPage").then((m) => ({ default: m.DocsPage })),
);
export const NotificationsPage = lazy(() =>
  import("@/features/inbox/NotificationsPage").then((m) => ({ default: m.NotificationsPage })),
);
export const AlertsPage = lazy(() =>
  import("@/features/alerts/AlertsPage").then((m) => ({ default: m.AlertsPage })),
);
export const TeamsPage = lazy(() =>
  import("@/features/settings/TeamsPage").then((m) => ({ default: m.TeamsPage })),
);
export const MembersPage = lazy(() =>
  import("@/features/members/MembersPage").then((m) => ({ default: m.MembersPage })),
);
export const BillingPage = lazy(() =>
  import("@/features/billing/BillingPage").then((m) => ({ default: m.BillingPage })),
);
export const StatusPage = lazy(() =>
  import("@/features/status/StatusPage").then((m) => ({ default: m.StatusPage })),
);
export const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
