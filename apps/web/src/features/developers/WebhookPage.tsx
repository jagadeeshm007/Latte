import type { WebhookEndpoint } from "@scc/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { RotateCwIcon, SendIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { PageNav } from "@/components/PageNav";
import { ErrorState, Loading, PageHeader } from "@/components/states";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, webhookDeliveriesQuery, webhookQuery, type DeliveryFilters } from "@/lib/endpoints";

import { EVENT_LABEL } from "./key-labels";

// One webhook endpoint: on or off, a test event, and every delivery with its
// attempts, so a failing integration can be found and replayed (ADR-0021).

const PAGE = 25;
const STATUS = [
  { value: "all", label: "All" },
  { value: "succeeded", label: "Delivered" },
  { value: "pending", label: "Retrying" },
  { value: "failed", label: "Failed" },
] as const;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });

export function WebhookPage({ webhookId }: { webhookId: string }) {
  const hook = useQuery(webhookQuery(webhookId));
  if (hook.isPending) return <Loading label="Loading the webhook" />;
  if (hook.isError) return <ErrorState error={hook.error} title="Could not open this webhook" />;
  return <WebhookView hook={hook.data} />;
}

function WebhookView({ hook }: { hook: WebhookEndpoint }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["webhooks"] });
  const fail = (e: Error) =>
    toastManager.add({ type: "error", title: "That did not work", description: e.message });
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => api.updateWebhook(hook.id, { enabled }),
    onSuccess: refresh,
    onError: fail,
  });
  const test = useMutation({
    mutationFn: () => api.testWebhook(hook.id),
    onSuccess: async () => {
      toastManager.add({
        type: "success",
        title: "Test event queued",
        description: "It goes out within a minute.",
      });
      await refresh();
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteWebhook(hook.id),
    onSuccess: async () => {
      await refresh();
      await navigate({ to: "/developers" });
    },
    onError: fail,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={hook.description || "Webhook endpoint"}
        description={hook.url}
        actions={
          <>
            <span className="flex items-center gap-2 text-sm">
              <Switch
                aria-label="Endpoint on"
                checked={!hook.disabledAt}
                onCheckedChange={(checked) => {
                  toggle.mutate(checked);
                }}
              />
              {hook.disabledAt ? "Off" : "On"}
            </span>
            <Button
              variant="outline"
              size="sm"
              loading={test.isPending}
              disabled={!!hook.disabledAt}
              onClick={() => {
                test.mutate();
              }}
            >
              <SendIcon aria-hidden="true" />
              Send test event
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive-outline" size="sm" />}>
                <Trash2Icon aria-hidden="true" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogPopup>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this endpoint?</AlertDialogTitle>
                  <AlertDialogDescription>
                    No more events go to {hook.url}, and its delivery log is deleted with it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
                  <AlertDialogClose
                    render={<Button variant="destructive" />}
                    onClick={() => {
                      remove.mutate();
                    }}
                  >
                    Delete endpoint
                  </AlertDialogClose>
                </AlertDialogFooter>
              </AlertDialogPopup>
            </AlertDialog>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Subscribed events">
          {hook.events.map((e) => (
            <Badge key={e} variant="outline">
              {EVENT_LABEL[e]}
            </Badge>
          ))}
          {hook.disabledReason ? <Badge variant="warning">{hook.disabledReason}</Badge> : null}
        </div>
      </PageHeader>
      <Deliveries hookId={hook.id} />
    </div>
  );
}

function Deliveries({ hookId }: { hookId: string }) {
  const [filters, setFilters] = useState<DeliveryFilters>({ page: 1, limit: PAGE });
  const queryClient = useQueryClient();
  const deliveries = useQuery({
    ...webhookDeliveriesQuery(hookId, filters),
    placeholderData: keepPreviousData,
  });
  const redeliver = useMutation({
    mutationFn: (deliveryId: string) => api.redeliverWebhook(hookId, deliveryId),
    onSuccess: async () => {
      toastManager.add({ type: "success", title: "Queued to send again" });
      await queryClient.invalidateQueries({ queryKey: ["webhooks", "deliveries", hookId] });
    },
    onError: (e) =>
      toastManager.add({ type: "error", title: "Could not redeliver", description: e.message }),
  });

  return (
    <Frame role="region" aria-labelledby="deliveries-heading">
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
        <FrameTitle role="heading" aria-level={2} id="deliveries-heading">
          Deliveries
        </FrameTitle>
        <ToggleGroup
          variant="outline"
          size="sm"
          aria-label="Delivery status"
          value={[filters.status ?? "all"]}
          onValueChange={(v: unknown[]) => {
            const next = STATUS.find((s) => s.value === v[0]);
            setFilters((f) => ({
              ...f,
              page: 1,
              status: next && next.value !== "all" ? next.value : undefined,
            }));
          }}
        >
          {STATUS.map((s) => (
            <ToggleGroupItem key={s.value} value={s.value}>
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FrameHeader>
      <FramePanel className="overflow-x-auto p-0">
        {deliveries.isPending ? (
          <Loading label="Loading deliveries" shape="table" />
        ) : deliveries.isError ? (
          <div className="p-4">
            <ErrorState error={deliveries.error} />
          </div>
        ) : deliveries.data.items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No deliveries yet. Send a test event to see one. Deliveries are kept for 30 days.
          </p>
        ) : (
          <Table aria-label="Deliveries">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Attempts</TableHead>
                <TableHead>Last response</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.data.items.map((d) => (
                <TableRow key={d.id} className="align-top">
                  <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {when(d.createdAt)}
                  </TableCell>
                  <TableCell>
                    <details>
                      <summary className="cursor-pointer font-mono text-xs">{d.eventType}</summary>
                      <pre className="mt-2 max-w-md overflow-x-auto rounded-md bg-muted/60 p-2 text-xs">
                        {JSON.stringify(d.payload, null, 2)}
                      </pre>
                    </details>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        d.status === "succeeded"
                          ? "success"
                          : d.status === "failed"
                            ? "error"
                            : "warning"
                      }
                    >
                      {d.status === "succeeded"
                        ? "Delivered"
                        : d.status === "failed"
                          ? "Failed"
                          : "Retrying"}
                    </Badge>
                    {d.status === "pending" && d.attempts > 0 ? (
                      <span className="block text-xs text-muted-foreground">
                        next {when(d.nextAttemptAt)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{d.attempts}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.lastStatus ? `HTTP ${String(d.lastStatus)}` : null}
                    {d.lastError && !d.lastStatus ? d.lastError : null}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="xs"
                      aria-label={`Send ${d.eventType} again`}
                      disabled={redeliver.isPending}
                      onClick={() => {
                        redeliver.mutate(d.id);
                      }}
                    >
                      <RotateCwIcon aria-hidden="true" />
                      Redeliver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FramePanel>
      {deliveries.data && deliveries.data.total > PAGE ? (
        <div className="border-t px-4 py-3">
          <PageNav
            page={filters.page}
            pageSize={PAGE}
            total={deliveries.data.total}
            label="deliveries"
            onPage={(page) => {
              setFilters((f) => ({ ...f, page }));
            }}
          />
        </div>
      ) : null}
    </Frame>
  );
}
