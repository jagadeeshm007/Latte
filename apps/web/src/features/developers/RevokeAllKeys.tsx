import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldOffIcon } from "lucide-react";
import { useState } from "react";

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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { api } from "@/lib/endpoints";

const CONFIRM = "REVOKE ALL";

/** RevokeAllKeys: the emergency stop for a leak; the phrase must be typed. */
export function RevokeAllKeys() {
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState("");
  const revoke = useMutation({
    mutationFn: () => api.revokeAllApiKeys(),
    onSuccess: async ({ revoked }) => {
      toastManager.add({
        type: "success",
        title: `${String(revoked)} key${revoked === 1 ? "" : "s"} revoked`,
      });
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e) =>
      toastManager.add({ type: "error", title: "Could not revoke", description: e.message }),
  });
  return (
    <AlertDialog
      onOpenChange={() => {
        setTyped("");
      }}
    >
      <AlertDialogTrigger render={<Button variant="destructive-outline" size="sm" />}>
        <ShieldOffIcon aria-hidden="true" />
        Revoke all keys
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke every API key?</AlertDialogTitle>
          <AlertDialogDescription>
            Every integration stops at once. Use this when a key may have leaked and you do not know
            which. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6">
          <Field>
            <FieldLabel>Type {CONFIRM} to confirm</FieldLabel>
            <Input
              value={typed}
              autoComplete="off"
              onChange={(e) => {
                setTyped(e.target.value);
              }}
            />
          </Field>
        </div>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
          <AlertDialogClose
            render={<Button variant="destructive" disabled={typed !== CONFIRM} />}
            onClick={() => {
              revoke.mutate();
            }}
          >
            Revoke all keys
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
