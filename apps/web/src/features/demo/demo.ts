import { demoSessionSchema, demoStatusSchema, type DemoSessionRequest } from "@scc/shared";
import { queryOptions } from "@tanstack/react-query";

import { apiFetch, apiSend } from "@/lib/api";
import { rememberDemo } from "@/lib/demo-token";

// The public demo (ADR-0033): whether it is on, and starting a session.

export const demoStatusQuery = queryOptions({
  queryKey: ["demo", "status"] as const,
  queryFn: ({ signal }) => apiFetch("/api/demo", demoStatusSchema, { signal }),
  staleTime: 60_000,
  retry: false,
});

/** The browser signals the API hashes, with the IP, into the device's limit key. */
function browserSignals(): DemoSessionRequest {
  return {
    platform: (
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ?? ""
    ).slice(0, 64),
    language: navigator.language.slice(0, 35),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64),
    screen: `${String(window.screen.width)}x${String(window.screen.height)}`,
  };
}

/** startDemo opens a demo session; the session store then shows the app as a demo manager. */
export async function startDemo(): Promise<void> {
  const session = await apiSend("/api/demo/sessions", demoSessionSchema, "POST", browserSignals());
  rememberDemo(session);
}
