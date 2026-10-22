import process from "node:process";

import { LatteClient } from "@latte/sdk";

/** latteFromEnv: a client for LATTE_URL with LATTE_API_KEY, the way every example connects. */
export function latteFromEnv(env: NodeJS.ProcessEnv = process.env): LatteClient {
  const baseUrl = env.LATTE_URL;
  const apiKey = env.LATTE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "set LATTE_URL (your Latte domain) and LATTE_API_KEY (from Developers > API keys)",
    );
  }
  return new LatteClient({ baseUrl, apiKey });
}
