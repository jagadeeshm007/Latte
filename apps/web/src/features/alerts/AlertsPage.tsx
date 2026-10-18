import {
  ALERT_METRICS,
  ALERT_SCOPES,
  type AlertMetric,
  type AlertRule,
  type AlertRuleRequest,
} from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
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
import { alertFiringsQuery, alertRulesQuery, api, rubricQuery } from "@/lib/endpoints";

// Alerts (ADR-0025): rules that watch a team, product or agent against its
// own recent baseline and post to the inbox (and the alert.triggered
// webhook) when it slips past the threshold.

const METRIC_LABEL: Record<AlertMetric, string> = {
  flag_rate: "Flag rate rises",
  avg_score: "Average score falls",
  item_fail_rate: "Rubric item fail rate rises",
};
const SCOPE_LABEL = { team: "Each team", product: "Each product", agent: "Each agent" } as const;

const BLANK: AlertRuleRequest = {
  name: "",
  metric: "flag_rate",
  scope: "team",
  itemKey: null,
  thresholdPoints: 15,
  windowDays: 7,
  baselineDays: 28,
  minCalls: 5,
  cooldownHours: 24,
  enabled: true,
};

const toRequest = (r: AlertRule): AlertRuleRequest => ({
  name: r.name,
  metric: r.metric,
  scope: r.scope,
  itemKey: r.itemKey,
  thresholdPoints: r.thresholdPoints,
  windowDays: r.windowDays,
  baselineDays: r.baselineDays,
  minCalls: r.minCalls,
  cooldownHours: r.cooldownHours,
  enabled: r.enabled,
});

export function AlertsPage() {
  const rules = useQuery(alertRulesQuery);
  const firings = useQuery(alertFiringsQuery);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ id: string | null; rule: AlertRuleRequest } | null>(
    null,
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["alerts"] });
  const fail = (e: Error) =>
    toastManager.add({ type: "error", title: "That did not work", description: e.message });
  const toggle = useMutation({
    mutationFn: (r: AlertRule) =>
      api.updateAlertRule(r.id, { ...toRequest(r), enabled: !r.enabled }),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteAlertRule(id),
    onSuccess: refresh,
    onError: fail,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts"
        description="Find out when a team, product or agent slips, without watching the dashboard."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing({ id: null, rule: BLANK });
            }}
          >
            <PlusIcon aria-hidden="true" />
            New rule
          </Button>
        }
      />
      {rules.isPending ? (
        <Loading label="Loading alert rules" shape="table" />
      ) : rules.isError ? (
        <ErrorState error={rules.error} />
      ) : rules.data.items.length === 0 ? (
        <EmptyState
          title="No alert rules yet"
          description="For example: tell me when any team's flag rate rises 15 points above its last four weeks."
        />
      ) : (
        <Frame>
          <FramePanel className="overflow-x-auto p-0">
            <Table aria-label="Alert rules">
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Watches</TableHead>
                  <TableHead className="text-end">Fired, 30 days</TableHead>
                  <TableHead>On</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {SCOPE_LABEL[r.scope]}: {METRIC_LABEL[r.metric].toLowerCase()}
                      {r.itemKey ? ` (${r.itemKey})` : ""} by {r.thresholdPoints} points over{" "}
                      {r.windowDays} days, against the {r.baselineDays} days before
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{r.firings30d}</TableCell>
                    <TableCell>
                      <Switch
                        aria-label={`${r.name} on`}
                        checked={r.enabled}
                        onCheckedChange={() => {
                          toggle.mutate(r);
                        }}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${r.name}`}
                        onClick={() => {
                          setEditing({ id: r.id, rule: toRequest(r) });
                        }}
                      >
                        <PencilIcon aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${r.name}`}
                        onClick={() => {
                          remove.mutate(r.id);
                        }}
                      >
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </FramePanel>
        </Frame>
      )}
      <Frame role="region" aria-labelledby="firings-heading">
        <FrameHeader className="px-4 py-3">
          <FrameTitle role="heading" aria-level={2} id="firings-heading">
            Recent firings
          </FrameTitle>
        </FrameHeader>
        <FramePanel className="p-0">
          {(firings.data?.items ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No rule has fired yet.</p>
          ) : (
            <ul className="divide-y">
              {(firings.data?.items ?? []).map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <Badge variant="warning">{f.ruleName}</Badge>
                  <span className="font-medium">{f.groupName}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {f.value} against {f.baseline} ({f.calls} calls)
                  </span>
                  <span className="ms-auto text-xs text-muted-foreground tabular-nums">
                    {new Date(f.firedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </FramePanel>
      </Frame>
      {editing ? (
        <RuleDialog
          key={editing.id ?? "new"}
          id={editing.id}
          initial={editing.rule}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function RuleDialog({
  id,
  initial,
  onClose,
}: {
  id: string | null;
  initial: AlertRuleRequest;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const rubric = useQuery(rubricQuery);
  const [rule, setRule] = useState<AlertRuleRequest>(initial);
  const set = (patch: Partial<AlertRuleRequest>) => {
    setRule((r) => ({ ...r, ...patch }));
  };
  const save = useMutation({
    mutationFn: () => (id ? api.updateAlertRule(id, rule) : api.createAlertRule(rule)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      onClose();
    },
  });
  const number = (
    key: "thresholdPoints" | "windowDays" | "baselineDays" | "minCalls",
    label: string,
  ) => (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="number"
        min={1}
        value={String(rule[key] ?? "")}
        onChange={(e) => {
          set({ [key]: Number(e.target.value) });
        }}
      />
    </Field>
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPopup>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{id ? "Edit alert rule" : "New alert rule"}</DialogTitle>
            <DialogDescription>
              Compares each group's last days with the period just before, and alerts when it moves
              the wrong way by at least the threshold.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  required
                  maxLength={80}
                  value={rule.name}
                  onChange={(e) => {
                    set({ name: e.target.value });
                  }}
                />
              </Field>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">When</span>
              <OptionSelect
                label="Metric"
                value={rule.metric}
                options={ALERT_METRICS.map((m) => ({ value: m, label: METRIC_LABEL[m] }))}
                onChange={(m) => {
                  const metric = ALERT_METRICS.find((x) => x === m);
                  if (metric)
                    set({
                      metric,
                      itemKey:
                        metric === "item_fail_rate" ? (rubric.data?.items[0]?.key ?? null) : null,
                    });
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">For</span>
              <OptionSelect
                label="Scope"
                value={rule.scope}
                options={ALERT_SCOPES.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))}
                onChange={(s) => {
                  const scope = ALERT_SCOPES.find((x) => x === s);
                  if (scope) set({ scope });
                }}
              />
            </div>
            {rule.metric === "item_fail_rate" ? (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Rubric item</span>
                <OptionSelect
                  label="Rubric item"
                  value={rule.itemKey ?? null}
                  options={(rubric.data?.items ?? []).map((i) => ({
                    value: i.key,
                    label: i.label,
                  }))}
                  onChange={(itemKey) => {
                    set({ itemKey });
                  }}
                />
              </div>
            ) : null}
            {number("thresholdPoints", "By at least (points)")}
            {number("minCalls", "With at least (calls)")}
            {number("windowDays", "Over the last (days)")}
            {number("baselineDays", "Against the (days) before")}
            {save.isError ? (
              <Alert variant="error" role="alert" className="sm:col-span-2">
                <AlertDescription>{save.error.message}</AlertDescription>
              </Alert>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" type="button" />}>Cancel</DialogClose>
            <Button type="submit" loading={save.isPending} disabled={!rule.name.trim()}>
              {id ? "Save rule" : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
