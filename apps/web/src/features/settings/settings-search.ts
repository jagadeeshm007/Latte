import { z } from "zod";

/** The settings tabs, in order; the open one is in the URL so it can be linked to. */
export const SETTINGS_TABS = ["profile", "security", "notifications", "appearance"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

// A bad or missing tab in a pasted link opens the profile.
export const settingsSearchSchema = z.object({
  tab: z.enum(SETTINGS_TABS).optional().catch(undefined),
});
