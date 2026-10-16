import type { Me, Role } from "@scc/shared";
import type { RequestHandler } from "express";
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

import { ForbiddenError, UnauthorizedError } from "./errors.ts";
import { effectiveLimits, keyProblem, looksLikeKey, type KeyRow } from "./repo/api-keys.ts";

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

/**
 * authenticate rejects a missing or invalid token with 401 and a user with no
 * profile with 403. A bearer token that looks like an API key is checked as
 * one: it must be live, and the manager who created it must still be one;
 * the request then runs as that manager, limited by apiKeyGate to the key's
 * scopes (ADR-0018).
 */
export function authenticate(
  verify: VerifyToken,
  loadProfile: (id: string) => Promise<Me | null>,
  findKey: (token: string) => Promise<KeyRow | null> = () => Promise.resolve(null),
): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match?.[1]) {
      throw new UnauthorizedError();
    }
    if (looksLikeKey(match[1])) {
      const key = await findKey(match[1]);
      if (!key) throw new UnauthorizedError("invalid API key");
      const problem = keyProblem(key);
      if (problem) throw new UnauthorizedError(problem);
      const owner = await loadProfile(key.created_by);
      if (owner?.role !== "manager") {
        throw new ForbiddenError("the person who created this API key can no longer use the API");
      }
      req.user = owner;
      req.apiKey = {
        id: key.id,
        name: key.name,
        scopes: key.scopes,
        limits: effectiveLimits(key.limits),
      };
      next();
      return;
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
