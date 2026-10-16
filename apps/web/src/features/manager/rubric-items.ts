import type { ItemType } from "@scc/shared";

// Shared by the rubric table and the item dialog.

export const TYPE_LABEL: Record<ItemType, string> = {
  mandatory: "Mandatory",
  prohibited: "Prohibited",
  quality: "Quality",
};

/**
 * keyFor makes a stable key from a label ("Free look period" to
 * free_look_period), numbered when taken. Findings and judge agreement group
 * by the key, so an edited item keeps the one it has.
 */
export function keyFor(label: string, taken: string[]): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  // A key starts with a letter and has at least two characters (rubricItemSchema).
  const base = /^[a-z][a-z0-9_]+$/.test(slug) ? slug : `item_${slug}`.replace(/_+$/, "");
  let key = base;
  for (let n = 2; taken.includes(key); n++) key = `${base}_${String(n)}`;
  return key;
}
