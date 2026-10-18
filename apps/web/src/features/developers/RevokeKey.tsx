import type { ApiKey } from "@scc/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BanIcon } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { api } from "@/lib/endpoints";

/** RevokeKey: stop a key for good, after asking. */
export function RevokeKey({ apiKey }: { apiKey: ApiKey }) {
  const queryClient = useQueryClient();
  const revoke = useMutation({
    mutationFn: () => api.revokeApiKey(apiKey.id),
    onSuccess: async () => {
      toastManager.add({ type: "success", title: "API key revoked", description: apiKey.name });
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e) =>
      toastManager.add({ type: "error", title: "Could not revoke", description: e.message }),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive-outline" size="sm" />}>
        <BanIcon aria-hidden="true" />
        Revoke
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke {apiKey.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Every request with this key fails from now on. This cannot be undone: create a new key
            to connect again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
          <AlertDialogClose
            render={<Button variant="destructive" loading={revoke.isPending} />}
            onClick={() => {
              revoke.mutate();
            }}
          >
            Revoke key
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
