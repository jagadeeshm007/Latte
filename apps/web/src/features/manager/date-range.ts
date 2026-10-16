import type { DateRange } from "@/lib/endpoints";

// The dashboard's date ranges, counted back from today in UTC (call dates are
// plain dates, so a range is whole days).

export const RANGE_KEYS = ["7d", "30d", "90d", "1y"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export const RANGES: { value: RangeKey; label: string; days: number }[] = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "1y", label: "1 year", days: 365 },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** rangeOf turns a range key into from/to dates ending today. */
export function rangeOf(key: RangeKey, today = new Date()): DateRange {
  const days = RANGES.find((r) => r.value === key)?.days ?? 30;
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: iso(from), to: iso(today) };
}
