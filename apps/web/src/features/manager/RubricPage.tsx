import { ITEM_TYPES, rubricItemsSchema, type Rubric, type RubricItem } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { ErrorState, Loading, PageHeader } from "@/components/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Group, GroupText } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { api, meQuery, rubricQuery, rubricsQuery } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";

// S9: the rubric the judge scores against. Managers save a new version;
// earlier scores keep the version they were judged by (US-01-004, Q-006).

export function RubricPage() {
  const me = useQuery(meQuery);
  const rubric = useQuery(rubricQuery);
  const history = useQuery(rubricsQuery);
  if (rubric.isPending || me.isPending) return <Loading />;
  if (rubric.isError) return <ErrorState error={rubric.error} />;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Rubric"
        description={`Version ${String(rubric.data.version)} is active: ${rubric.data.name}. New calls are scored with it.`}
      />
      {me.data?.role === "manager" ? (
        <RubricEditor key={rubric.data.id} rubric={rubric.data} />
      ) : (
        <RubricView items={rubric.data.items} />
      )}
      {history.data ? (
        <Frame role="region" aria-labelledby="history-heading">
          <FrameHeader className="px-3 py-2">
            <FrameTitle role="heading" aria-level={2} id="history-heading">
              Versions
            </FrameTitle>
          </FrameHeader>
          <FramePanel className="p-0">
            <ul className="divide-y text-sm">
              {history.data.items.map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-4 py-2">
                  <span className="font-medium tabular-nums">v{r.version}</span>
                  <span>{r.name}</span>
                  <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
                  {r.isActive ? <Badge variant="success">active</Badge> : null}
                </li>
              ))}
            </ul>
          </FramePanel>
        </Frame>
      ) : null}
    </div>
  );
}

function RubricView({ items }: { items: RubricItem[] }) {
  return (
    <Frame>
      <FramePanel className="p-0">
        <ul className="divide-y">
          {items.map((i) => (
            <li key={i.key} className="px-4 py-2.5">
              <p className="text-sm font-medium">
                {i.label} <Badge variant="outline">{i.type}</Badge>
              </p>
              <p className="text-sm text-muted-foreground">{i.description}</p>
            </li>
          ))}
        </ul>
      </FramePanel>
    </Frame>
  );
}

export function RubricEditor({ rubric }: { rubric: Rubric }) {
  const [name, setName] = useState(rubric.name);
  const [items, setItems] = useState<RubricItem[]>(rubric.items);
  const queryClient = useQueryClient();
  const parsed = rubricItemsSchema.safeParse(items);
  const problem = parsed.success
    ? name.trim()
      ? null
      : "Give the rubric a name"
    : (parsed.error.issues[0]?.message ?? "Check the items");

  const save = useMutation({
    mutationFn: () => api.saveRubric(name.trim(), items),
    onSuccess: async (saved) => {
      toastManager.add({
        type: "success",
        title: `Version ${String(saved.version)} is now active`,
      });
      await queryClient.invalidateQueries({ queryKey: ["rubric"] });
    },
    onError: (e) => toastManager.add({ type: "error", title: "Not saved", description: e.message }),
  });

  const edit = (index: number, patch: Partial<RubricItem>) => {
    setItems((current) => current.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  return (
    <Frame>
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-3 py-2">
        <Group aria-label="Rubric name" className="min-w-64 flex-1 sm:max-w-md">
          <GroupText className="h-8 sm:h-7">Name</GroupText>
          <Input
            size="sm"
            aria-label="Rubric name"
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </Group>
        <Group aria-label="Rubric actions">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setItems((current) => [
                ...current,
                {
                  key: `item_${String(current.length + 1)}`,
                  type: "mandatory",
                  label: "New item",
                  description: "Describe what the agent must do.",
                },
              ]);
            }}
          >
            <PlusIcon aria-hidden="true" />
            Add item
          </Button>
          <Button
            size="sm"
            disabled={problem !== null}
            loading={save.isPending}
            onClick={() => {
              save.mutate();
            }}
          >
            Save as version {rubric.version + 1}
          </Button>
        </Group>
      </FrameHeader>
      {problem ? (
        <Alert variant="warning" className="mb-1">
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      ) : null}
      <FramePanel className="p-0">
        <div className="hidden grid-cols-[12rem_9rem_1fr_2rem] gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground uppercase md:grid">
          <span>Label</span>
          <span>Type</span>
          <span>What the judge looks for</span>
          <span className="sr-only">Remove</span>
        </div>
        <ul className="divide-y">
          {items.map((item, index) => (
            <li
              key={index}
              className="grid items-start gap-2 px-4 py-2.5 md:grid-cols-[12rem_9rem_1fr_2rem]"
            >
              <div className="flex flex-col gap-1">
                <Input
                  size="sm"
                  aria-label={`Label of item ${String(index + 1)}`}
                  value={item.label}
                  maxLength={60}
                  onChange={(e) => {
                    edit(index, { label: e.target.value });
                  }}
                />
                <span className="text-xs text-muted-foreground">key: {item.key}</span>
              </div>
              <OptionSelect
                size="sm"
                label={`Type of ${item.label}`}
                value={item.type}
                options={ITEM_TYPES.map((t) => ({ value: t, label: t }))}
                onChange={(t) => {
                  edit(index, { type: t as RubricItem["type"] });
                }}
              />
              <Textarea
                size="sm"
                aria-label={`What the judge looks for in ${item.label}`}
                value={item.description}
                maxLength={600}
                onChange={(e) => {
                  edit(index, { description: e.target.value });
                }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${item.label}`}
                onClick={() => {
                  setItems((current) => current.filter((_, i) => i !== index));
                }}
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </FramePanel>
    </Frame>
  );
}
