import type { CallSummary, Role } from "@scc/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArchiveIcon, ArchiveRestoreIcon, EllipsisIcon, EyeIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { api } from "@/lib/endpoints";

type Action = "archive" | "unarchive" | "delete";

const DONE: Record<Action, string> = {
  archive: "Call archived",
  unarchive: "Call restored",
  delete: "Call deleted",
};

/**
 * CallActions is a row's menu: view the call, archive or restore it, and for
 * managers delete it. Archive and delete only hide the call (ADR-0015).
 */
export function CallActions({ call, role }: { call: CallSummary; role: Role }) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const act = useMutation({
    mutationFn: (action: Action) =>
      action === "archive"
        ? api.archive(call.id)
        : action === "unarchive"
          ? api.unarchive(call.id)
          : api.deleteCall(call.id),
    onSuccess: async (_, action) => {
      toastManager.add({
        type: "success",
        title: DONE[action],
        description: call.originalFilename,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calls"] }),
        queryClient.invalidateQueries({ queryKey: ["queue"] }),
      ]);
    },
    onError: (e) =>
      toastManager.add({ type: "error", title: "That did not work", description: e.message }),
  });

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${call.originalFilename}`}
            />
          }
        >
          <EllipsisIcon aria-hidden="true" />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuItem render={<Link to="/calls/$callId" params={{ callId: call.id }} />}>
            <EyeIcon aria-hidden="true" />
            View
          </MenuItem>
          {call.archivedAt ? (
            <MenuItem
              onClick={() => {
                act.mutate("unarchive");
              }}
            >
              <ArchiveRestoreIcon aria-hidden="true" />
              Unarchive
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                act.mutate("archive");
              }}
            >
              <ArchiveIcon aria-hidden="true" />
              Archive
            </MenuItem>
          )}
          {role === "manager" ? (
            <>
              <MenuSeparator />
              <MenuItem
                variant="destructive"
                onClick={() => {
                  setConfirmDelete(true);
                }}
              >
                <Trash2Icon aria-hidden="true" />
                Delete
              </MenuItem>
            </>
          ) : null}
        </MenuPopup>
      </Menu>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {call.originalFilename}?</AlertDialogTitle>
            <AlertDialogDescription>
              The call disappears from every list, the queue and the dashboards. It is hidden, not
              erased: its recording, transcript and findings stay on record for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button
              variant="destructive"
              loading={act.isPending}
              onClick={() => {
                act.mutate("delete", {
                  onSettled: () => {
                    setConfirmDelete(false);
                  },
                });
              }}
            >
              Delete call
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
