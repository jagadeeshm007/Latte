import { z } from "zod";

// The only place that reads import.meta.env. Every VITE_ variable is inlined
// into the bundle and is public; nothing secret belongs here.
const envSchema = z.object({
  VITE_API_URL: z
    .string()
    .default("")
    .transform((url) => url.replace(/\/+$/, "")),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(import.meta.env);
