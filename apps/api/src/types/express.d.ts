import type { Me } from "@scc/shared";

// The signed-in caller, set by authenticate() in src/auth.ts.
declare global {
  namespace Express {
    interface Request {
      user?: Me;
    }
  }
}
