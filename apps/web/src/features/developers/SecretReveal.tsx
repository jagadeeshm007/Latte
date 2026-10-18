import { CheckIcon, CopyIcon, KeyRoundIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

/**
 * SecretReveal: a new secret (an API key or a webhook signing secret) shown
 * once, inside a dialog, with a copy button. Latte cannot show it again.
 */
export function SecretReveal({
  title,
  description,
  label,
  secret,
  keepNote,
}: {
  title: string;
  description: string;
  /** The accessible name of the field, e.g. "New API key". */
  label: string;
  secret: string;
  /** Why it is shown only once, and what to do if it is lost. */
  keepNote: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-3">
        <Alert variant="warning">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>Shown once</AlertTitle>
          <AlertDescription>{keepNote}</AlertDescription>
        </Alert>
        <InputGroup>
          <InputGroupAddon>
            <KeyRoundIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            readOnly
            aria-label={label}
            value={secret}
            className="font-mono text-xs"
            onFocus={(e) => {
              e.currentTarget.select();
            }}
          />
          <InputGroupAddon align="inline-end">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(secret).then(() => {
                  setCopied(true);
                });
              }}
            >
              {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button />}>Done</DialogClose>
      </DialogFooter>
    </>
  );
}
