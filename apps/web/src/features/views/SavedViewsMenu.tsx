import type { SavedView, SavedViewPage } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkIcon, BookmarkPlusIcon, Settings2Icon, Trash2Icon, UsersIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { api, savedViewsQuery } from "@/lib/endpoints";

// Saved views (ADR-0025): a page's filters under a name, for oneself or the
// team. The page parses a view's filters with its own URL schema on apply, so
// a stale or odd view drops only the values it no longer understands.

type Search = Record<string, string | number | boolean>;

/** Only the set filters, so a view stores what was chosen and nothing else. */
function compact(current: Record<string, unknown>): Search {
  const out: Search = {};
  for (const [k, v] of Object.entries(current)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

export function SavedViewsMenu({
  page,
  current,
  onApply,
}: {
  page: SavedViewPage;
  current: Record<string, unknown>;
  onApply: (search: Record<string, unknown>) => void;
}) {
  const views = useQuery(savedViewsQuery(page));
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState(false);
  const mine = (views.data?.items ?? []).filter((v) => v.mine);
  const shared = (views.data?.items ?? []).filter((v) => !v.mine);

  return (
    <>
      <Menu>
        <MenuTrigger render={<Button variant="outline" size="sm" />}>
          <BookmarkIcon aria-hidden="true" />
          Views
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-56">
          {mine.length > 0 ? (
            <MenuGroup>
              <MenuGroupLabel>My views</MenuGroupLabel>
              {mine.map((v) => (
                <MenuItem
                  key={v.id}
                  onClick={() => {
                    onApply(v.search);
                  }}
                >
                  {v.name}
                  {v.shared ? <UsersIcon aria-label="shared" className="ms-auto size-3.5" /> : null}
                </MenuItem>
              ))}
            </MenuGroup>
          ) : null}
          {shared.length > 0 ? (
            <MenuGroup>
              <MenuGroupLabel>Shared with the team</MenuGroupLabel>
              {shared.map((v) => (
                <MenuItem
                  key={v.id}
                  onClick={() => {
                    onApply(v.search);
                  }}
                >
                  {v.name}
                  <span className="ms-auto text-xs text-muted-foreground">{v.ownerName}</span>
                </MenuItem>
              ))}
            </MenuGroup>
          ) : null}
          {mine.length + shared.length > 0 ? <MenuSeparator /> : null}
          <MenuItem
            onClick={() => {
              setSaving(true);
            }}
          >
            <BookmarkPlusIcon aria-hidden="true" />
            Save current view
          </MenuItem>
          {mine.length > 0 ? (
            <MenuItem
              onClick={() => {
                setManaging(true);
              }}
            >
              <Settings2Icon aria-hidden="true" />
              Manage my views
            </MenuItem>
          ) : null}
        </MenuPopup>
      </Menu>
      <SaveViewDialog
        page={page}
        search={compact(current)}
        open={saving}
        onOpenChange={setSaving}
      />
      <ManageViewsDialog page={page} views={mine} open={managing} onOpenChange={setManaging} />
    </>
  );
}

function SaveViewDialog({
  page,
  search,
  open,
  onOpenChange,
}: {
  page: SavedViewPage;
  search: Search;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const save = useMutation({
    mutationFn: () => api.saveView({ page, name: name.trim(), search, shared }),
    onSuccess: async () => {
      toastManager.add({ type: "success", title: "View saved", description: name.trim() });
      onOpenChange(false);
      setName("");
      setShared(false);
      await queryClient.invalidateQueries({ queryKey: ["saved-views", page] });
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
            <DialogDescription>
              {Object.keys(search).length === 0
                ? "No filters are set; the view opens the page as it is."
                : `Keeps ${String(Object.keys(search).length)} filter${Object.keys(search).length === 1 ? "" : "s"} under a name.`}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                required
                maxLength={80}
                placeholder="e.g. Flagged Hindi calls"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </Field>
            <div className="flex items-center gap-2 text-sm">
              <Switch
                aria-label="Share with the team"
                checked={shared}
                onCheckedChange={setShared}
              />
              Share with the team
            </div>
            {save.isError ? (
              <Alert variant="error" role="alert">
                <AlertDescription>{save.error.message}</AlertDescription>
              </Alert>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" type="button" />}>Cancel</DialogClose>
            <Button type="submit" loading={save.isPending} disabled={!name.trim()}>
              Save view
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

function ManageViewsDialog({
  page,
  views,
  open,
  onOpenChange,
}: {
  page: SavedViewPage;
  views: SavedView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["saved-views", page] });
  const fail = (e: Error) =>
    toastManager.add({ type: "error", title: "That did not work", description: e.message });
  const share = useMutation({
    mutationFn: (v: { id: string; shared: boolean }) => api.updateView(v.id, { shared: v.shared }),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteView(id),
    onSuccess: refresh,
    onError: fail,
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>My views</DialogTitle>
          <DialogDescription>Share a view with the team, or delete it.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <ul className="divide-y">
            {views.map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{v.name}</span>
                <Switch
                  aria-label={`Share ${v.name}`}
                  checked={v.shared}
                  onCheckedChange={(checked) => {
                    share.mutate({ id: v.id, shared: checked });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${v.name}`}
                  onClick={() => {
                    remove.mutate(v.id);
                  }}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
