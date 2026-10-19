import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { statusQuery } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

/** StatusBanner: an open incident, shown across the top of the app until it is resolved. */
export function StatusBanner() {
  const status = useQuery(statusQuery);
  const open = (status.data?.notices ?? []).find((n) => !n.resolvedAt);
  if (!open) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 px-4 py-2 text-sm print:hidden",
        open.severity === "outage" ? "bg-destructive/10" : "bg-warning/10",
      )}
    >
      <span className="font-medium">{open.title}</span>
      <Link to="/status" className="underline underline-offset-4">
        Status page
      </Link>
    </div>
  );
}
