import { cn } from "@/lib/utils";

// Espresso cup with crema on light themes; reversed on dark so the cup never
// sinks into a dark background.
const CUP = "fill-[#2A1C15] dark:fill-[#E8CFA6]";
const MILK = "fill-[#E8CFA6] dark:fill-[#2A1C15]";

/**
 * LatteMark: the Tulip logo. A cup seen from above, a latte-art tulip pour,
 * and one line through it: the playhead that marks the second of a finding.
 * `small` is the cut for 32 px and under: two layers and a heavier line.
 */
export function LatteMark({
  className,
  label,
  small = false,
}: {
  className?: string;
  label?: string;
  small?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("size-8 shrink-0", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {small ? (
        <>
          <circle cx="50" cy="50" r="48" className={CUP} />
          <circle cx="50" cy="58" r="28" className={MILK} />
          <circle cx="50" cy="50" r="20" className={CUP} />
          <circle cx="50" cy="44" r="11" className={MILK} />
          <rect x="46" y="28" width="8" height="60" rx="4" className={CUP} />
        </>
      ) : (
        <>
          <circle cx="50" cy="50" r="46" className={CUP} />
          <circle cx="50" cy="60" r="24" className={MILK} />
          <circle cx="50" cy="55" r="19.5" className={CUP} />
          <circle cx="50" cy="50" r="15" className={MILK} />
          <circle cx="50" cy="46" r="11" className={CUP} />
          <circle cx="50" cy="42" r="7" className={MILK} />
          <rect x="48.7" y="30" width="2.6" height="56" rx="1.3" className={CUP} />
        </>
      )}
    </svg>
  );
}
