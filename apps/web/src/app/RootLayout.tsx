import type { Me, Role } from "@scc/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  AudioLinesIcon,
  CoffeeIcon,
  BookCheckIcon,
  TrophyIcon,
  GaugeIcon,
  InboxIcon,
  SirenIcon,
  ReceiptIcon,
  UsersRoundIcon,
  UserCogIcon,
  KeyRoundIcon,
  LayersIcon,
  ListIcon,
  LogOutIcon,
  UploadIcon,
} from "lucide-react";
import { Suspense, type ReactNode } from "react";

import { ErrorState, Loading } from "@/components/states";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/features/auth/session";
import { SignInPage } from "@/features/auth/SignInPage";
import { NotificationBell } from "@/features/inbox/NotificationBell";
import { MiniPlayer } from "@/features/player/MiniPlayer";
import { PlayerHost } from "@/features/player/PlayerHost";
import { StatusBanner } from "@/features/status/StatusBanner";
import { meQuery } from "@/lib/endpoints";

const NAV: { to: string; label: string; roles: Role[]; icon: ReactNode }[] = [
  {
    to: "/queue",
    label: "Review queue",
    roles: ["qa_reviewer", "manager"],
    icon: <InboxIcon aria-hidden="true" />,
  },
  {
    to: "/calls",
    label: "Calls",
    roles: ["qa_reviewer", "manager", "agent"],
    icon: <ListIcon aria-hidden="true" />,
  },
  {
    to: "/batches",
    label: "Batches",
    roles: ["qa_reviewer", "manager"],
    icon: <LayersIcon aria-hidden="true" />,
  },
  {
    to: "/scorecard",
    label: "My scorecard",
    roles: ["agent"],
    icon: <AudioLinesIcon aria-hidden="true" />,
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    roles: ["manager"],
    icon: <GaugeIcon aria-hidden="true" />,
  },
  {
    to: "/performance",
    label: "Performance",
    roles: ["manager"],
    icon: <TrophyIcon aria-hidden="true" />,
  },
  {
    to: "/alerts",
    label: "Alerts",
    roles: ["manager"],
    icon: <SirenIcon aria-hidden="true" />,
  },
  {
    to: "/members",
    label: "Members",
    roles: ["manager"],
    icon: <UserCogIcon aria-hidden="true" />,
  },
  {
    to: "/teams",
    label: "Teams",
    roles: ["manager"],
    icon: <UsersRoundIcon aria-hidden="true" />,
  },
  {
    to: "/billing",
    label: "Billing",
    roles: ["manager"],
    icon: <ReceiptIcon aria-hidden="true" />,
  },
  {
    to: "/developers",
    label: "Developers",
    roles: ["manager"],
    icon: <KeyRoundIcon aria-hidden="true" />,
  },
  {
    to: "/rubric",
    label: "Rubric",
    roles: ["qa_reviewer", "manager"],
    icon: <BookCheckIcon aria-hidden="true" />,
  },
];

const ROLE_LABEL: Record<Role, string> = {
  qa_reviewer: "QA reviewer",
  agent: "Sales agent",
  manager: "Manager",
};

/**
 * RootLayout: the sign-in gate, then the shell with navigation for the
 * caller's role. Every route renders inside it; the API still checks every
 * role on every request, the menu only hides what a role cannot use.
 */
/** Pages anyone may open without signing in. */
const PUBLIC_PATHS = new Set(["/status"]);

export function RootLayout() {
  const session = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (PUBLIC_PATHS.has(pathname) && session.status !== "signed_in") {
    return (
      <main className="min-h-svh bg-muted/40 px-4 py-10">
        <Suspense fallback={<Loading label="Loading the page" />}>
          <Outlet />
        </Suspense>
      </main>
    );
  }
  if (session.status === "loading") return <Loading shape="app" />;
  if (session.status === "signed_out") return <SignInPage />;
  return <Shell />;
}

function Shell() {
  const me = useQuery(meQuery);
  if (me.isPending) return <Loading label="Loading your account" shape="app" />;
  if (me.isError) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <ErrorState error={me.error} title="Your account is not ready" />
        <Button className="mt-4" variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </main>
    );
  }
  return <Frame me={me.data} />;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

function Frame({ me }: { me: Me }) {
  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col border-b bg-sidebar md:sticky md:top-0 md:h-svh md:border-e md:border-b-0 print:hidden">
        <div className="px-4 py-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm [&_svg]:size-4.5">
              <CoffeeIcon aria-hidden="true" />
            </span>
            <span className="font-heading text-sm leading-tight font-semibold">
              Latte
              <span className="block text-xs font-normal text-muted-foreground">QA workspace</span>
            </span>
          </Link>
        </div>
        {me.role !== "agent" ? (
          // The one action people come here for most: first, and a button, not a nav row.
          <div className="px-3 pb-3">
            <Button
              className="w-full justify-center"
              render={<Link to="/upload" />}
              aria-label="Upload calls"
            >
              <UploadIcon aria-hidden="true" />
              Upload calls
            </Button>
          </div>
        ) : null}
        <nav
          aria-label="Main"
          className="flex gap-0.5 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible"
        >
          <span className="hidden px-2.5 pt-2 pb-1.5 text-xs font-medium text-muted-foreground md:block">
            Workspace
          </span>
          {NAV.filter((n) => n.roles.includes(me.role)).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm whitespace-nowrap text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
              activeProps={{
                className: "bg-sidebar-accent font-medium text-foreground shadow-xs/5",
              }}
            >
              {n.icon}
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-3 border-t px-3 py-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
          <UserCard me={me} />
        </div>
      </aside>
      {/* One player for the whole app, so a call keeps playing across pages. */}
      <PlayerHost />
      <MiniPlayer />
      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto mb-4 w-full max-w-7xl empty:hidden">
          <StatusBanner />
        </div>
        <div className="mx-auto w-full max-w-7xl">
          <Suspense fallback={<Loading label="Loading the page" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function UserCard({ me }: { me: Me }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-1">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{initials(me.displayName)}</AvatarFallback>
      </Avatar>
      <p className="min-w-0 flex-1 text-sm leading-tight">
        <span className="block truncate font-medium">{me.displayName}</span>
        <span className="block truncate text-xs text-muted-foreground">{ROLE_LABEL[me.role]}</span>
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Sign out"
        title="Sign out"
        onClick={() => void signOut()}
      >
        <LogOutIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
