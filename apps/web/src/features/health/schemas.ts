import { z } from "zod";

// One schema per response shape; the type is inferred, never redeclared.
export const healthSchema = z.object({
  status: z.string().min(1),
  version: z.string().optional(),
});

export type Health = z.infer<typeof healthSchema>;
