import type { ApiBucket, ApiScope, Me } from "@scc/shared";

// The signed-in caller (and the API key, when one was used), set by authenticate() in src/auth.ts.
declare global {
  namespace Express {
    interface Request {
      user?: Me;
      /** Set when the request came with an API key instead of a session (ADR-0018). */
      apiKey?: { id: string; name: string; scopes: ApiScope[]; limits: Record<ApiBucket, number> };
    }
  }
}
