import { Link } from "@tanstack/react-router";
import { useLayoutEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { allScreens, type GallerySearch } from "./registry";
import type { ScreenSpec } from "./screen";

/**
 * useLook applies ?theme= the way the app does (the dark class) and
 * ?variant= as data-variant, which a direction's CSS keys its tokens on.
 */
function useLook(theme: GallerySearch["theme"], variant: GallerySearch["variant"]) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme) {
      root.classList.toggle("dark", theme === "dark");
      root.dataset.theme = theme;
    }
    if (variant) {
      root.dataset.variant = variant;
    } else {
      delete root.dataset.variant;
    }
  }, [theme, variant]);
}

/** GalleryIndex lists every screen by feature, each state one click away. */
export function GalleryIndex({ screens = allScreens() }: { screens?: ScreenSpec[] }) {
  const features = [...new Set(screens.map((s) => s.feature))];
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Design gallery</h1>
        <p className="text-muted-foreground">
          {screens.length} screens, every state from fixtures, rendered with the app&apos;s own
          components.
        </p>
      </header>
      {features.map((feature) => (
        <section key={feature} aria-labelledby={`f-${feature}`} className="space-y-3">
          <h2 id={`f-${feature}`} className="text-sm font-medium text-muted-foreground uppercase">
            {feature}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {screens
              .filter((s) => s.feature === feature)
              .map((s) => (
                <Card key={s.id}>
                  <CardHeader>
                    <CardTitle>
                      <Link to="/__design/$id" params={{ id: s.id }} className="hover:underline">
                        {s.id} {s.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>{s.job}</CardDescription>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {Object.keys(s.states).map((state) => (
                        <Badge key={state} variant="secondary">
                          {state}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                </Card>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * GalleryScreen renders one screen in one state. ?state= picks the state
 * (default: the first), ?theme=dark switches the theme, ?chrome=0 hides the
 * state switcher for screenshots.
 */
export function GalleryScreen({
  id,
  search,
  screens = allScreens(),
}: {
  id: string;
  search: GallerySearch;
  screens?: ScreenSpec[];
}) {
  useLook(search.theme, search.variant);
  const spec = screens.find((s) => s.id === id);
  if (!spec) {
    return <p role="alert">No screen {id} in the gallery.</p>;
  }
  const names = Object.keys(spec.states);
  const current = search.state && names.includes(search.state) ? search.state : names[0];
  const render = current ? spec.states[current] : undefined;
  return (
    <div className="space-y-6" data-screen={spec.id} data-state={current}>
      {search.chrome !== "0" && (
        <Tabs value={current ?? ""}>
          <TabsList aria-label={`${spec.id} states`}>
            {names.map((name) => (
              <TabsTrigger key={name} value={name} asChild>
                <Link
                  to="/__design/$id"
                  params={{ id: spec.id }}
                  search={{ ...search, state: name }}
                >
                  {name}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {render?.()}
    </div>
  );
}
