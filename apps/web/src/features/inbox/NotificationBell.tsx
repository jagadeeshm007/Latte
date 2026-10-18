import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BellIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { unreadQuery } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

/** NotificationBell: the inbox, with how many are unread; checked every minute. */
export function NotificationBell() {
  const unread = useQuery(unreadQuery);
  const n = unread.data?.unread ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label={n > 0 ? `Notifications, ${String(n)} unread` : "Notifications"}
      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "relative")}
    >
      <BellIcon aria-hidden="true" />
      {n > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-xs leading-none font-semibold text-brand-foreground tabular-nums"
        >
          {n > 99 ? "99+" : n}
        </span>
      ) : null}
    </Link>
  );
}
