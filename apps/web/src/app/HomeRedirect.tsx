import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";

import { Loading } from "@/components/states";
import { meQuery } from "@/lib/endpoints";

/** Each role lands on its own home (AC-US-00-003-1): QA on the queue, managers on the dashboard, agents on their scorecard. */
export function HomeRedirect() {
  const me = useQuery(meQuery);
  if (!me.data) return <Loading />;
  const to =
    me.data.role === "agent" ? "/scorecard" : me.data.role === "manager" ? "/dashboard" : "/queue";
  return <Navigate to={to} replace />;
}
