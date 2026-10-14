import { z } from "zod";

// The rubric is data: managers edit it (US-01-004) and the scorer reads the
// active version. Talk ratio is not an item: it is computed in code (REQ-014).

export const ITEM_TYPES = ["mandatory", "prohibited", "quality"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const FINDING_STATUSES = [
  "met",
  "missed",
  "partial",
  "breach",
  "clear",
  "not_applicable",
] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

/** Statuses an item of each type may take; mirrors chk_findings_status_fits_type. */
export const STATUSES_BY_TYPE: Record<ItemType, readonly FindingStatus[]> = {
  mandatory: ["met", "missed", "partial", "not_applicable"],
  quality: ["met", "missed", "partial", "not_applicable"],
  prohibited: ["breach", "clear", "not_applicable"],
};

export const rubricItemSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]{1,40}$/, "lower snake case, 2 to 41 characters")
    .describe("Stable key; findings and agreement group by it"),
  type: z.enum(ITEM_TYPES),
  label: z.string().min(1).max(60),
  description: z.string().min(1).max(600),
});
export type RubricItem = z.infer<typeof rubricItemSchema>;

export const rubricItemsSchema = z
  .array(rubricItemSchema)
  .min(1)
  .max(20)
  .refine((items) => new Set(items.map((i) => i.key)).size === items.length, {
    message: "item keys must be unique",
  });

export const DEFAULT_RUBRIC_NAME = "Insurance sales compliance v1";

export const DEFAULT_RUBRIC: RubricItem[] = [
  {
    key: "greeting",
    type: "mandatory",
    label: "Greeting",
    description:
      "The agent greets the customer and states their own name and the company name near the start of the call.",
  },
  {
    key: "identity_check",
    type: "mandatory",
    label: "Identity check",
    description:
      "Before discussing policy or personal details, the agent verifies the customer's identity with at least one personal detail such as date of birth, registered mobile number or policy number.",
  },
  {
    key: "disclosure",
    type: "mandatory",
    label: "Risk and charges disclosure",
    description:
      "The agent states that returns are not guaranteed or are subject to market risk where relevant, and discloses premiums, charges or exclusions of the product discussed.",
  },
  {
    key: "consent",
    type: "mandatory",
    label: "Explicit consent",
    description:
      "Before proceeding with a purchase, renewal or change, the agent asks for and receives the customer's explicit agreement to proceed.",
  },
  {
    key: "cooling_off",
    type: "mandatory",
    label: "Cooling-off period",
    description:
      "The agent tells the customer about the free-look or cooling-off period in which the policy can be cancelled for a refund.",
  },
  {
    key: "guaranteed_returns",
    type: "prohibited",
    label: "Guaranteed returns claim",
    description:
      "The agent claims or implies that returns on a market-linked or non-guaranteed product are guaranteed, assured, fixed, risk-free or certain (for example 'guaranteed 12 percent', 'pakka return', 'no risk at all').",
  },
  {
    key: "false_urgency",
    type: "prohibited",
    label: "False urgency",
    description:
      "The agent pressures the customer with a deadline or scarcity that is not real, such as 'offer ends today', 'only two policies left' or 'price goes up tomorrow', to force a decision.",
  },
  {
    key: "misrepresentation",
    type: "prohibited",
    label: "Misrepresentation",
    description:
      "The agent misstates what the product is or does: calls insurance a fixed deposit or savings account, claims government backing that does not exist, hides lock-in or surrender charges, or promises cover the policy does not give.",
  },
  {
    key: "need_discovery",
    type: "quality",
    label: "Need discovery",
    description:
      "The agent asks about the customer's needs, goals, dependants, income or existing cover before recommending a product.",
  },
];
