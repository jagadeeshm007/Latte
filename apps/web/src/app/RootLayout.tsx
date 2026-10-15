import type { Me, Role } from "@scc/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import {
  AudioLinesIcon,
  BookCheckIcon,
  GaugeIcon,
  InboxIcon,
  ListIcon,
  LogOutIcon,
  UploadIcon,
} from "lucide-react";
import { Suspense, type ReactNode } from "react";

import { ErrorState, Loading } from "@/components/states";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/features/auth/session";
import { SignInPage } from "@/features/auth/SignInPage";
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
    to: "/upload",
    label: "Upload",
    roles: ["qa_reviewer", "manager"],
    icon: <UploadIcon aria-hidden="true" />,
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
export function RootLayout() {
  const session = useSession();
  if (session.status === "loading") return <Loading />;
  if (session.status === "signed_out") return <SignInPage />;
  return <Shell />;
}

function Shell() {
  const me = useQuery(meQuery);
  if (me.isPending) return <Loading label="Loading your account" />;
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

function Frame({ me }: { me: Me }) {
  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[13.5rem_1fr]">
      <aside className="border-b bg-sidebar md:min-h-svh md:border-e md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-3 py-3 md:flex-col md:items-start md:gap-1">
          <Link to="/" className="font-heading text-base font-semibold">
            Call Compliance
          </Link>
          <p className="text-sm text-muted-foreground">
            {me.displayName}
            <span className="block text-xs">{ROLE_LABEL[me.role]}</span>
          </p>
        </div>
        <nav
          aria-label="Main"
          className="flex gap-0.5 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible"
        >
          {NAV.filter((n) => n.roles.includes(me.role)).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-sidebar-foreground hover:bg-sidebar-accent [&_svg]:size-4"
              activeProps={{ className: "bg-sidebar-accent font-medium text-foreground" }}
            >
              {n.icon}
              {n.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm text-sidebar-foreground hover:bg-sidebar-accent [&_svg]:size-4"
          >
            <LogOutIcon aria-hidden="true" />
            Sign out
          </button>
        </nav>
      </aside>
      <main className="min-w-0 px-4 py-4 md:px-6">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
