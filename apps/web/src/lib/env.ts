import { z } from "zod";

// The only place that reads import.meta.env. Every VITE_ variable is inlined
// into the bundle and is public; nothing secret belongs here (tenet 7).
const envSchema = z.object({
  VITE_API_URL: z
    .string()
    .default("")
    .transform((url) => url.replace(/\/+$/, "")),
  VITE_SUPABASE_URL: z.string().default("http://supabase.test"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().default("missing-publishable-key"),
  /**
   * Sign-in options to offer besides email and password, comma separated:
   * google, azure (Microsoft), saml. Each must be set up in Supabase Auth first.
   */
  VITE_AUTH_PROVIDERS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((p) => p.trim())
        .filter((p): p is "google" | "azure" | "saml" => ["google", "azure", "saml"].includes(p)),
    ),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(import.meta.env);
