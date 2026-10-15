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
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(import.meta.env);
