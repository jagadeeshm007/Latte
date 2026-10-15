import type { Me, Role } from "@scc/shared";
import type { RequestHandler } from "express";
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

import { ForbiddenError, UnauthorizedError } from "./errors.ts";

// Supabase Auth issues the access token; the API verifies it against the
// project's JWKS (ADR-0003), then loads the caller's single role (REQ-001).

export type VerifyToken = (token: string) => Promise<{ sub: string }>;

export function createVerifier(keys: JWTVerifyGetKey, supabaseUrl: string): VerifyToken {
  const issuer = `${supabaseUrl.replace(/\/+$/, "")}/auth/v1`;
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: "authenticated",
      algorithms: ["ES256", "RS256"],
      requiredClaims: ["exp", "sub"],
    });
    if (!payload.sub) {
      throw new UnauthorizedError("token has no subject");
    }
    return { sub: payload.sub };
  };
}

export function remoteKeys(jwksUrl: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(jwksUrl), { cacheMaxAge: 10 * 60 * 1000 });
}

/** authenticate rejects a missing or invalid token with 401 and a user with no profile with 403. */
export function authenticate(
  verify: VerifyToken,
  loadProfile: (id: string) => Promise<Me | null>,
): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match?.[1]) {
      throw new UnauthorizedError();
    }
    let sub: string;
    try {
      ({ sub } = await verify(match[1]));
    } catch {
      throw new UnauthorizedError("invalid or expired token");
    }
    const profile = await loadProfile(sub);
    if (!profile) {
      throw new ForbiddenError("this account has no role yet; ask a manager to set one up");
    }
    req.user = profile;
    next();
  };
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}

/** currentUser is the signed-in caller; routes behind authenticate always have one. */
export function currentUser(req: { user?: Me }): Me {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user;
}

/** scopeOf is the SQL visibility of the caller: agents see only their own calls (tenet 4). */
export function scopeOf(user: Me): { agentId: string | null } {
  if (user.role === "agent") {
    // An agent profile always links an agent record (chk_profiles_agent_link).
    return { agentId: user.agentId ?? "00000000-0000-0000-0000-000000000000" };
  }
  return { agentId: null };
}
