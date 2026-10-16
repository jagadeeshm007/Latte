import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { setTheme, type Theme, THEMES, useTheme } from "@/lib/theme";

const ICON: Record<Theme, { label: string; icon: ReactNode }> = {
  light: { label: "Light theme", icon: <SunIcon aria-hidden="true" /> },
  dark: { label: "Dark theme", icon: <MoonIcon aria-hidden="true" /> },
  system: { label: "Match system theme", icon: <MonitorIcon aria-hidden="true" /> },
};

/** ThemeToggle: light, dark or follow the OS, in one compact group. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      aria-label="Colour theme"
      className={className}
      value={[theme]}
      onValueChange={(v: unknown[]) => {
        const next = v[0];
        if (next === "light" || next === "dark" || next === "system") setTheme(next);
      }}
    >
      {THEMES.map((t) => (
        <ToggleGroupItem key={t} value={t} aria-label={ICON[t].label} title={ICON[t].label}>
          {ICON[t].icon}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
