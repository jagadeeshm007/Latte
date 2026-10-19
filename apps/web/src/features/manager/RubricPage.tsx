import { type ItemType, rubricItemsSchema, type Rubric, type RubricItem } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EllipsisIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { ErrorState, Loading, PageHeader } from "@/components/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Group, GroupText } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { api, meQuery, referenceQuery, rubricForQuery, rubricVersionsQuery } from "@/lib/endpoints";

import { TYPE_LABEL } from "./rubric-items";
import { RubricItemDialog } from "./RubricItemDialog";
import { RubricVersions } from "./RubricVersions";

// S9: the rubric the judge scores against. Items read as a table; managers add
// and edit them in a dialog and save the draft as a new active version.
// Earlier scores keep the version they were judged by (US-01-004, Q-006).

const TYPE_TONE: Record<ItemType, "info" | "error" | "secondary"> = {
  mandatory: "info",
  prohibited: "error",
  quality: "secondary",
};

export function RubricPage() {
  const reference = useQuery(referenceQuery);
  const [productId, setProductId] = useState<string | null>(null);
  const products = reference.data?.products ?? [];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rubric"
        description="What the judge scores each call against. Each product can have its own; the rest use the default."
        actions={
          <OptionSelect
            size="sm"
            label="Rubric for"
            className="w-56"
            value={productId ?? DEFAULT}
            options={[
              { value: DEFAULT, label: "Default rubric" },
              ...products.map((p) => ({ value: p.id, label: p.name })),
            ]}
            onChange={(v) => {
              setProductId(v === DEFAULT ? null : v);
            }}
          />
        }
      />
      {/* Keyed, so another product starts from its own versions and an empty draft. */}
      <RubricScope
        key={productId ?? DEFAULT}
        productId={productId}
        productName={products.find((p) => p.id === productId)?.name ?? null}
      />
    </div>
  );
}

const DEFAULT = "default";

/** RubricScope: the rubric, versions and editor for the default or for one product. */
function RubricScope({
  productId,
  productName,
}: {
  productId: string | null;
  productName: string | null;
}) {
  const me = useQuery(meQuery);
  const active = useQuery(rubricForQuery(productId));
  const history = useQuery(rubricVersionsQuery(productId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingFrom, setEditingFrom] = useState<string | null>(null);
  if (active.isPending || me.isPending) return <Loading label="Loading the rubric" />;
  if (active.isError) return <ErrorState error={active.error} />;

  // A product without its own rubric is scored by the default one.
  const inherited = productId !== null && active.data.productId === null;
  const own = history.data?.items ?? (inherited ? [] : [active.data]);
  const versions = own.length > 0 ? own : [active.data];
  const viewing = versions.find((r) => r.id === selectedId) ?? active.data;
  const isManager = me.data?.role === "manager";
  const nextVersion = Math.max(...versions.map((r) => r.version)) + 1;
  const editing =
    isManager && ((viewing.id === active.data.id && !inherited) || editingFrom === viewing.id);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {inherited
          ? `${productName ?? "This product"} has no rubric of its own: it is scored with the default, v${String(active.data.version)}.`
          : `Version ${String(active.data.version)} is active: ${active.data.name}. New ${productName ? `${productName} ` : ""}calls are scored with it.`}
      </p>
      {inherited && isManager && editingFrom === null ? (
        <Alert variant="info">
          <AlertTitle>Give {productName ?? "this product"} its own rubric</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            Start from the default and change what differs for this product.
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setEditingFrom(active.data.id);
              }}
            >
              <PlusIcon aria-hidden="true" />
              Create a rubric for {productName ?? "this product"}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {viewing.id !== active.data.id && !inherited ? (
        <Alert variant="info">
          <AlertTitle>
            Viewing v{viewing.version}
            {editing ? ", as the start of a new version" : " (not active)"}
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            Calls scored with it keep it; new calls use v{active.data.version}.
            {isManager && !editing ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setEditingFrom(viewing.id);
                }}
              >
                <PencilIcon aria-hidden="true" />
                Edit as new version
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {editing ? (
        <RubricEditor
          key={viewing.id}
          rubric={viewing}
          nextVersion={nextVersion}
          productId={productId}
        />
      ) : (
        <Frame>
          <RubricItemsTable items={viewing.items} />
        </Frame>
      )}
      {history.isError ? <ErrorState error={history.error} title="Versions not loaded" /> : null}
      {history.data && history.data.items.length > 0 ? (
        <RubricVersions
          versions={history.data.items}
          selectedId={viewing.id}
          onSelect={(r) => {
            setSelectedId(r.id);
            setEditingFrom(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** RubricItemsTable shows items read-only; `actions` adds the Edit and Delete menu per row. */
function RubricItemsTable({
  items,
  actions,
}: {
  items: RubricItem[];
  actions?: { onEdit: (index: number) => void; onDelete: (index: number) => void };
}) {
  const columns = actions
    ? "md:grid-cols-[13rem_7.5rem_minmax(0,1fr)_2.5rem]"
    : "md:grid-cols-[13rem_7.5rem_minmax(0,1fr)]";
  return (
    <FramePanel className="p-0">
      <div
        aria-hidden="true"
        className={`hidden gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground uppercase md:grid ${columns}`}
      >
        <span>Label</span>
        <span>Type</span>
        <span>What the judge looks for</span>
        {actions ? <span className="sr-only">Actions</span> : null}
      </div>
      <ul className="divide-y" aria-label="Rubric items">
        {items.map((item, index) => (
          <li
            key={item.key}
            className={`grid items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm ${columns} grid-cols-[minmax(0,1fr)_auto]`}
          >
            <span className="truncate font-medium">{item.label}</span>
            <span>
              <Badge variant={TYPE_TONE[item.type]}>{TYPE_LABEL[item.type]}</Badge>
            </span>
            {/* One line ending in an ellipsis; the full text is in the tooltip. */}
            <span
              className="col-span-2 truncate text-muted-foreground md:col-span-1"
              title={item.description}
            >
              {item.description}
            </span>
            {actions ? (
              <Menu>
                <MenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${item.label}`}
                      className="col-start-2 row-start-1 justify-self-end md:col-start-auto md:row-start-auto"
                    />
                  }
                >
                  <EllipsisIcon aria-hidden="true" />
                </MenuTrigger>
                <MenuPopup align="end">
                  <MenuItem
                    onClick={() => {
                      actions.onEdit(index);
                    }}
                  >
                    <PencilIcon aria-hidden="true" />
                    Edit
                  </MenuItem>
                  <MenuItem
                    variant="destructive"
                    onClick={() => {
                      actions.onDelete(index);
                    }}
                  >
                    <Trash2Icon aria-hidden="true" />
                    Delete
                  </MenuItem>
                </MenuPopup>
              </Menu>
            ) : null}
          </li>
        ))}
      </ul>
    </FramePanel>
  );
}

/**
 * RubricEditor holds a draft of `rubric`: items are added, edited and deleted
 * in dialogs, and the draft is saved as the next version, which becomes active.
 */
export function RubricEditor({
  rubric,
  nextVersion,
  productId = null,
}: {
  rubric: Rubric;
  nextVersion: number;
  /** Save as this product's rubric; null saves the default. */
  productId?: string | null;
}) {
  const [name, setName] = useState(rubric.name);
  const [items, setItems] = useState<RubricItem[]>(rubric.items);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const queryClient = useQueryClient();
  // Copying another scope's rubric (the default, into a product) is worth saving unchanged.
  const changed =
    rubric.productId !== productId ||
    name.trim() !== rubric.name ||
    JSON.stringify(items) !== JSON.stringify(rubric.items);
  const parsed = rubricItemsSchema.safeParse(items);
  const problem = !name.trim()
    ? "Give the rubric a name"
    : parsed.success
      ? null
      : (parsed.error.issues[0]?.message ?? "Check the items");
  const editing = editIndex === null ? undefined : items[editIndex];
  const deleting = deleteIndex === null ? undefined : items[deleteIndex];
  const keys = items.map((i) => i.key);

  const save = useMutation({
    mutationFn: () => api.saveRubric(name.trim(), items, productId),
    onSuccess: async (saved) => {
      toastManager.add({
        type: "success",
        title: `Version ${String(saved.version)} is now active`,
      });
      await queryClient.invalidateQueries({ queryKey: ["rubric"] });
    },
    onError: (e) => toastManager.add({ type: "error", title: "Not saved", description: e.message }),
  });

  return (
    <Frame>
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
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
          <RubricItemDialog
            takenKeys={keys}
            trigger={
              <Button size="sm" variant="outline">
                <PlusIcon aria-hidden="true" />
                Add item
              </Button>
            }
            onSave={(item) => {
              setItems((current) => [...current, item]);
            }}
          />
          {changed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setName(rubric.name);
                setItems(rubric.items);
              }}
            >
              <RotateCcwIcon aria-hidden="true" />
              Discard changes
            </Button>
          ) : null}
          <Button
            size="sm"
            disabled={!changed || problem !== null}
            loading={save.isPending}
            onClick={() => {
              save.mutate();
            }}
          >
            Save as version {nextVersion}
          </Button>
        </Group>
      </FrameHeader>
      {problem ? (
        <Alert variant="warning" className="mb-1">
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      ) : null}
      <FrameTitle className="sr-only">Items</FrameTitle>
      <RubricItemsTable
        items={items}
        actions={{ onEdit: setEditIndex, onDelete: setDeleteIndex }}
      />
      <RubricItemDialog
        item={editing}
        takenKeys={keys}
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditIndex(null);
        }}
        onSave={(item) => {
          setItems((current) => current.map((it, i) => (i === editIndex ? item : it)));
        }}
      />
      <AlertDialog
        open={deleting !== undefined}
        onOpenChange={(open) => {
          if (!open) setDeleteIndex(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              The judge stops checking it once you save the next version. Calls already scored keep
              their findings for it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setItems((current) => current.filter((_, i) => i !== deleteIndex));
                setDeleteIndex(null);
              }}
            >
              Delete item
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </Frame>
  );
}
