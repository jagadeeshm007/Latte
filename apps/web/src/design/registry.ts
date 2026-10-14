import type { ScreenModule, ScreenSpec } from "./screen";

// Every *.screen.tsx under src/features, found at build time. A new screen
// file appears in the gallery with no registration.
const modules = import.meta.glob<ScreenModule>("/src/features/**/screens/*.screen.tsx", {
  eager: true,
});

export function allScreens(found: Record<string, ScreenModule> = modules): ScreenSpec[] {
  return Object.values(found)
    .map((m) => m.screen)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

// Design directions from design-directions: src/design/variants/<n>-<name>.css,
// each overriding the tokens under [data-variant="<n>-<name>"], so three
// directions render the same screens with the same components and differ
// only where a direction may: type, colour, density, radius, motion.
const variantFiles = import.meta.glob("/src/design/variants/*.css", { eager: true });

export const variantNames: string[] = Object.keys(variantFiles)
  .map((path) => path.replace(/^.*\/(.+)\.css$/, "$1"))
  .sort();

export interface GallerySearch {
  state?: string | undefined;
  theme?: "light" | "dark" | undefined;
  chrome?: "0" | "1" | undefined;
  variant?: string | undefined;
}

export function parseGallerySearch(search: Record<string, unknown>): GallerySearch {
  const theme = search.theme === "dark" || search.theme === "light" ? search.theme : undefined;
  const chrome = search.chrome === "0" || search.chrome === 0 ? "0" : undefined;
  const state = typeof search.state === "string" ? search.state : undefined;
  const variant =
    typeof search.variant === "string" && /^[0-9]+-[a-z0-9-]+$/.test(search.variant)
      ? search.variant
      : undefined;
  return { state, theme, chrome, variant };
}
