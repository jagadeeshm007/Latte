import type { Notification } from "@scc/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { BellRingIcon, CheckCheckIcon, LayersIcon, NewspaperIcon } from "lucide-react";
import { useState } from "react";

import { PageNav } from "@/components/PageNav";
import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, notificationsQuery } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

// The inbox (ADR-0025): alerts and digests, newest first. Opening one marks
// it read and follows its link; digest settings sit beside the list.

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const list = useQuery({
    ...notificationsQuery({ unread: unreadOnly, page }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const readAll = useMutation({ mutationFn: () => api.markAllRead(), onSuccess: refresh });
  const open = useMutation({
    mutationFn: (n: Notification) => (n.readAt ? Promise.resolve(undefined) : api.markRead(n.id)),
    onSuccess: async (_, n) => {
      await refresh();
      if (n.link) await navigate({ to: n.link });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Finished batches, alerts when a team or agent slips, and your digests."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!list.data?.unread}
            loading={readAll.isPending}
            onClick={() => {
              readAll.mutate();
            }}
          >
            <CheckCheckIcon aria-hidden="true" />
            Mark all read
          </Button>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Frame>
          <FrameHeader className="flex-row items-center justify-between gap-2 px-4 py-3">
            <FrameTitle>Inbox</FrameTitle>
            <ToggleGroup
              variant="outline"
              size="sm"
              aria-label="Show"
              value={[unreadOnly ? "unread" : "all"]}
              onValueChange={(v: unknown[]) => {
                setUnreadOnly(v[0] === "unread");
                setPage(1);
              }}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="unread">
                Unread{list.data?.unread ? ` (${String(list.data.unread)})` : ""}
              </ToggleGroupItem>
            </ToggleGroup>
          </FrameHeader>
          <FramePanel className="p-0">
            {list.isPending ? (
              <Loading label="Loading notifications" shape="table" />
            ) : list.isError ? (
              <div className="p-4">
                <ErrorState error={list.error} />
              </div>
            ) : list.data.items.length === 0 ? (
              <EmptyState
                title={unreadOnly ? "All caught up" : "Nothing here yet"}
                description="Alerts land here when a rule fires; digests when you turn them on."
              />
            ) : (
              <ul aria-label="Notifications" className="divide-y">
                {list.data.items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        open.mutate(n);
                      }}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-start outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
                        !n.readAt && "bg-brand/5",
                      )}
                    >
                      {n.kind === "alert" ? (
                        <BellRingIcon
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-warning-foreground"
                        />
                      ) : n.kind === "batch" ? (
                        <LayersIcon
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-brand"
                        />
                      ) : (
                        <NewspaperIcon
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn("text-sm", !n.readAt && "font-semibold")}>
                          {n.title}
                          {n.readAt ? null : <span className="sr-only"> (unread)</span>}
                        </span>
                        <span className="text-sm text-muted-foreground">{n.body}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {when(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FramePanel>
          {list.data && list.data.total > 20 ? (
            <div className="border-t px-4 py-3">
              <PageNav
                page={page}
                pageSize={20}
                total={list.data.total}
                label="notifications"
                onPage={setPage}
              />
            </div>
          ) : null}
        </Frame>
        <p className="text-sm text-muted-foreground">
          A daily or weekly digest of these numbers by email is set in{" "}
          <Link
            to="/settings"
            search={{ tab: "notifications" }}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
