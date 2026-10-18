import {
  NOTICE_SEVERITIES,
  type Status,
  type StatusComponent,
  type StatusNotice,
} from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, CircleXIcon } from "lucide-react";
import { useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { ErrorState, Loading } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { useSession } from "@/features/auth/session";
import { api, meQuery, statusQuery } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

// The status page (ADR-0026): public, so customers can check it when they
// cannot sign in. Each component's state now and its uptime over 90 days,
// and the incidents managers post.

const COMPONENT_LABEL: Record<StatusComponent, string> = {
  api: "API",
  database: "Database",
  storage: "Recording storage",
  processing: "Call processing",
  models: "Speech and scoring models",
};
const OVERALL = {
  operational: {
    label: "All systems operational",
    icon: CheckCircle2Icon,
    tone: "text-success-foreground",
  },
  degraded: {
    label: "Some systems are degraded",
    icon: CircleAlertIcon,
    tone: "text-warning-foreground",
  },
  outage: { label: "Outage", icon: CircleXIcon, tone: "text-destructive-foreground" },
} as const;
const SEVERITY_BADGE = { info: "info", degraded: "warning", outage: "error" } as const;

export function StatusPage() {
  const status = useQuery(statusQuery);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Latte status</h1>
      {status.isPending ? (
        <Loading label="Loading status" shape="text" />
      ) : status.isError ? (
        <ErrorState error={status.error} title="Status could not be loaded" />
      ) : (
        <StatusView status={status.data} />
      )}
      <ManageNotices />
    </div>
  );
}

function StatusView({ status }: { status: Status }) {
  const overall = OVERALL[status.overall];
  const Icon = overall.icon;
  return (
    <>
      <Frame>
        <FramePanel className="flex items-center gap-3 px-4 py-4">
          <Icon aria-hidden="true" className={cn("size-6", overall.tone)} />
          <div>
            <p className="font-semibold">{overall.label}</p>
            <p className="text-xs text-muted-foreground">
              Checked{" "}
              {new Date(status.checkedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </FramePanel>
      </Frame>
      {status.notices.length > 0 ? (
        <section aria-label="Incidents" className="flex flex-col gap-2">
          {status.notices.map((n) => (
            <NoticeCard key={n.id} notice={n} />
          ))}
        </section>
      ) : null}
      <Frame role="region" aria-labelledby="components-heading">
        <FrameHeader className="px-4 py-3">
          <FrameTitle role="heading" aria-level={2} id="components-heading">
            Components, last 90 days
          </FrameTitle>
        </FrameHeader>
        <FramePanel className="p-0">
          <ul className="divide-y">
            {status.components.map((c) => {
              const known = c.history.filter((d) => d.uptime !== null);
              const uptime = known.length
                ? known.reduce((sum, d) => sum + (d.uptime ?? 0), 0) / known.length
                : null;
              return (
                <li key={c.component} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{COMPONENT_LABEL[c.component]}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {uptime === null ? null : (
                        <span className="tabular-nums">{(uptime * 100).toFixed(2)}% uptime</span>
                      )}
                      <Badge variant={c.ok ? "success" : "error"}>
                        {c.ok ? "Operational" : "Down"}
                      </Badge>
                    </span>
                  </div>
                  <div className="flex h-6 gap-px" aria-hidden="true">
                    {c.history.map((d) => (
                      <span
                        key={d.day}
                        title={`${d.day}: ${d.uptime === null ? "no data" : `${(d.uptime * 100).toFixed(1)}%`}`}
                        className={cn(
                          "flex-1 rounded-sm",
                          d.uptime === null
                            ? "bg-muted"
                            : d.uptime >= 0.99
                              ? "bg-success"
                              : d.uptime >= 0.9
                                ? "bg-warning"
                                : "bg-destructive",
                        )}
                      />
                    ))}
                  </div>
                  {!c.ok && c.detail ? (
                    <p className="text-xs text-destructive-foreground">{c.detail}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </FramePanel>
      </Frame>
    </>
  );
}

function NoticeCard({ notice: n, onResolve }: { notice: StatusNotice; onResolve?: () => void }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={n.resolvedAt ? "secondary" : SEVERITY_BADGE[n.severity]}>
          {n.resolvedAt ? "Resolved" : n.severity}
        </Badge>
        <span className="font-medium">{n.title}</span>
        {onResolve && !n.resolvedAt ? (
          <Button size="xs" variant="outline" className="ms-auto" onClick={onResolve}>
            Mark resolved
          </Button>
        ) : null}
      </div>
      {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
      <p className="text-xs text-muted-foreground">
        Since{" "}
        {new Date(n.startedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
      </p>
    </div>
  );
}

/** ManageNotices: posting and resolving incidents, for a signed-in manager. */
function ManageNotices() {
  const session = useSession();
  const me = useQuery({ ...meQuery, enabled: session.status === "signed_in" });
  const status = useQuery(statusQuery);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<(typeof NOTICE_SEVERITIES)[number]>("degraded");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["status"] });
  const post = useMutation({
    mutationFn: () => api.postNotice({ title: title.trim(), severity }),
    onSuccess: async () => {
      setTitle("");
      await refresh();
    },
  });
  const resolve = useMutation({
    mutationFn: (id: string) => api.resolveNotice(id),
    onSuccess: refresh,
  });
  if (me.data?.role !== "manager") return null;
  const open = (status.data?.notices ?? []).filter((n) => !n.resolvedAt);
  return (
    <Frame role="region" aria-labelledby="manage-heading">
      <FrameHeader className="px-4 py-3">
        <FrameTitle role="heading" aria-level={2} id="manage-heading">
          Post an incident
        </FrameTitle>
      </FrameHeader>
      <FramePanel className="flex flex-col gap-3 px-4 py-3">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) post.mutate();
          }}
        >
          <div className="min-w-56 flex-1">
            <Field>
              <FieldLabel>What is happening</FieldLabel>
              <Input
                maxLength={120}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                }}
              />
            </Field>
          </div>
          <OptionSelect
            label="Severity"
            className="w-36"
            value={severity}
            options={NOTICE_SEVERITIES.map((s) => ({ value: s, label: s }))}
            onChange={(v) => {
              const next = NOTICE_SEVERITIES.find((s) => s === v);
              if (next) setSeverity(next);
            }}
          />
          <Button type="submit" loading={post.isPending} disabled={!title.trim()}>
            Post
          </Button>
        </form>
        {open.map((n) => (
          <NoticeCard
            key={n.id}
            notice={n}
            onResolve={() => {
              resolve.mutate(n.id);
            }}
          />
        ))}
      </FramePanel>
    </Frame>
  );
}
