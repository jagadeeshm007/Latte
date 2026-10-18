import type { ApiKey, CreatedApiKey } from "@scc/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/endpoints";

import { SecretReveal } from "./SecretReveal";

/**
 * RotateKeyDialog: make a successor with the same scopes and limits. The old
 * key keeps working for 24 hours, so a deploy can swap keys without downtime.
 */
export function RotateKeyDialog({ apiKey }: { apiKey: ApiKey }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rotated, setRotated] = useState<CreatedApiKey | null>(null);
  const rotate = useMutation({
    mutationFn: () => api.rotateApiKey(apiKey.id),
    onSuccess: async (result) => {
      setRotated(result);
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // The secret leaves memory with the dialog.
        if (!next) {
          setRotated(null);
          rotate.reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <RefreshCwIcon aria-hidden="true" />
        Rotate
      </DialogTrigger>
      <DialogPopup>
        {rotated ? (
          <>
            <SecretReveal
              title="Copy the new key"
              description={`Swap it into ${apiKey.name}'s configuration. The old key stops in 24 hours.`}
              label="New API key"
              secret={rotated.secret}
              keepNote="Latte keeps only a hash. If the key is lost, rotate again."
            />
            <div className="px-6 pb-4">
              <Link
                to="/developers/$keyId"
                params={{ keyId: rotated.key.id }}
                className={buttonVariants({ variant: "link", size: "sm" })}
              >
                Open the new key
              </Link>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rotate {apiKey.name}?</DialogTitle>
              <DialogDescription>
                A new key is made with the same scopes, limits and expiry. The current key keeps
                working for 24 hours, then stops.
              </DialogDescription>
            </DialogHeader>
            {rotate.isError ? (
              <DialogPanel>
                <Alert variant="error" role="alert">
                  <AlertDescription>{rotate.error.message}</AlertDescription>
                </Alert>
              </DialogPanel>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button
                loading={rotate.isPending}
                onClick={() => {
                  rotate.mutate();
                }}
              >
                Rotate key
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}
