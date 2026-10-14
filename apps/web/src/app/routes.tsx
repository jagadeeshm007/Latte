import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";

import { HomePage } from "@/app/HomePage";
import { NotFound } from "@/app/NotFound";
import { RootLayout } from "@/app/RootLayout";
import { RouteError } from "@/app/RouteError";
import { GalleryIndex, GalleryScreen } from "@/design/Gallery";
import { parseGallerySearch } from "@/design/registry";

// Code-based routes. A route that needs data adds
// `loader: ({ context }) => context.queryClient.ensureQueryData(options)`
// and its component calls `useSuspenseQuery(options)`; a route that reads the
// URL adds `validateSearch: searchSchema.parse`. A loader or component that
// throws lands in RouteError (the root errorComponent) with the layout intact.
interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

// The design gallery: every *.screen.tsx in every state, inside this layout.
// On in `vite dev`, and in a build only with VITE_DESIGN_GALLERY=1 (the
// design review and the smoke run use it); a production build drops it.
export const designGalleryEnabled =
  import.meta.env.DEV || import.meta.env.VITE_DESIGN_GALLERY === "1";

const galleryIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/__design",
  component: () => <GalleryIndex />,
});

const galleryScreenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/__design/$id",
  validateSearch: parseGallerySearch,
  component: function GalleryScreenRoute() {
    const { id } = galleryScreenRoute.useParams();
    const search = galleryScreenRoute.useSearch();
    return <GalleryScreen id={id} search={search} />;
  },
});

export const routeTree = rootRoute.addChildren(
  designGalleryEnabled ? [indexRoute, galleryIndexRoute, galleryScreenRoute] : [indexRoute],
);

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
