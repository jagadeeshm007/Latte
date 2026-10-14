import { z } from "zod";

import { FINDING_STATUSES, type RubricItem, STATUSES_BY_TYPE } from "./rubric.ts";

// The judge returns statuses and segment numbers only; code copies quotes and
// times from the transcript (tenet 2). Short notes keep the output inside the
// 1000-token cap with reasoning included.

export const NOTE_MAX = 120;
export const COACHING_MAX = 160;

export const judgeItemSchema = z.object({
  key: z.string(),
  status: z.enum(FINDING_STATUSES),
  segments: z.array(z.number().int().nonnegative()).max(5),
  note: z.string().max(NOTE_MAX * 2),
});

export const judgeOutputSchema = z.object({
  items: z.array(judgeItemSchema),
  coaching: z.array(z.string().max(COACHING_MAX * 2)).max(3),
});
export type JudgeOutput = z.infer<typeof judgeOutputSchema>;
export type JudgeItem = z.infer<typeof judgeItemSchema>;

/**
 * judgeJsonSchema builds the strict JSON schema sent to the provider for one
 * rubric: every object closed, every field required (Groq strict mode rules).
 */
export function judgeJsonSchema(items: RubricItem[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["items", "coaching"],
    properties: {
      items: {
        type: "array",
        minItems: items.length,
        maxItems: items.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "status", "segments", "note"],
          properties: {
            key: { type: "string", enum: items.map((i) => i.key) },
            status: { type: "string", enum: [...FINDING_STATUSES] },
            segments: { type: "array", items: { type: "integer" }, maxItems: 5 },
            note: { type: "string", maxLength: NOTE_MAX },
          },
        },
      },
      coaching: {
        type: "array",
        maxItems: 3,
        items: { type: "string", maxLength: COACHING_MAX },
      },
    },
  };
}

/** statusFits says whether a status is allowed for an item type. */
export function statusFits(item: Pick<RubricItem, "type">, status: string): boolean {
  return (STATUSES_BY_TYPE[item.type] as readonly string[]).includes(status);
}
