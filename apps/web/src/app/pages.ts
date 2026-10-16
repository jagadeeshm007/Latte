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
