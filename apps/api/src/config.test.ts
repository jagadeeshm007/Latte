import { describe, expect, it } from "vitest";

import { ConfigError, databaseUrl, jwksUrl, loadConfig, usesTls } from "./config.ts";

const base = {
  DATABASE_URL: "postgresql://postgres:pw@db.abcdef.supabase.co:5432/postgres",
  SUPABASE_URL: "https://abcdef.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_0123456789",
};

describe("loadConfig", () => {
  it("applies defaults and treats empty strings as unset", () => {
    const config = loadConfig({ ...base, GEMINI_API_KEY: "" });

    expect(config).toMatchObject({
      PORT: 8080,
      LLM_PROVIDER: "groq",
      LLM_BUDGET_USD: 5,
      MODEL_MODE: "live",
    });
    expect(config.GEMINI_API_KEY).toBeUndefined();
  });

  it("names every invalid variable at once", () => {
    expect(() => loadConfig({ DATABASE_URL: "mysql://x" })).toThrow(ConfigError);
    try {
      loadConfig({ DATABASE_URL: "mysql://x" });
    } catch (error) {
      expect((error as Error).message).toMatch(
        /DATABASE_URL[\s\S]*SUPABASE_URL[\s\S]*SUPABASE_SECRET_KEY/,
      );
    }
  });

  it("parses LOG_PRETTY as a boolean", () => {
    expect(loadConfig({ ...base, LOG_PRETTY: "true" }).LOG_PRETTY).toBe(true);
    expect(loadConfig({ ...base, LOG_PRETTY: "false" }).LOG_PRETTY).toBe(false);
  });
});

describe("databaseUrl", () => {
  it("rewrites the IPv6-only direct Supabase host to the session pooler", () => {
    const url = new URL(
      databaseUrl({
        DATABASE_URL: base.DATABASE_URL,
        SUPABASE_POOLER_HOST: "aws-0-ap-south-1.pooler.supabase.com",
      }),
    );

    expect(url.hostname).toBe("aws-0-ap-south-1.pooler.supabase.com");
    expect(url.username).toBe("postgres.abcdef");
  });

  it("keeps any other host as it is", () => {
    expect(
      databaseUrl({ DATABASE_URL: "postgres://u:p@localhost:5432/db", SUPABASE_POOLER_HOST: "x" }),
    ).toBe("postgres://u:p@localhost:5432/db");
  });

  it("uses TLS for Supabase and not for localhost", () => {
    const pooler = "aws-0-ap-south-1.pooler.supabase.com";
    expect(
      usesTls({ DATABASE_URL: base.DATABASE_URL, DB_SSL: false, SUPABASE_POOLER_HOST: pooler }),
    ).toBe(true);
    expect(
      usesTls({
        DATABASE_URL: "postgres://u:p@localhost/db",
        DB_SSL: false,
        SUPABASE_POOLER_HOST: pooler,
      }),
    ).toBe(false);
  });
});

describe("jwksUrl", () => {
  it("derives the JWKS endpoint from the project URL unless one is given", () => {
    expect(jwksUrl({ SUPABASE_URL: "https://abc.supabase.co/" })).toBe(
      "https://abc.supabase.co/auth/v1/.well-known/jwks.json",
    );
    expect(jwksUrl({ SUPABASE_URL: "x", SUPABASE_JWKS_URL: "https://k" })).toBe("https://k");
  });
});
