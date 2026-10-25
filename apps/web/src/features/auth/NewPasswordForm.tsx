import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { changePassword } from "./session";

/** The shortest password Latte accepts; Supabase may ask for more. */
export const MIN_PASSWORD = 8;

/**
 * NewPasswordForm: a new password, typed twice. Used by Settings > Security
 * and by the screen an invited or resetting person sees first (SCC-7-1).
 */
export function NewPasswordForm({
  submitLabel,
  pendingLabel,
  onChanged,
}: {
  submitLabel: string;
  pendingLabel: string;
  onChanged?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = useMutation({
    mutationFn: async () => {
      const error = await changePassword(password);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      setPassword("");
      setConfirm("");
      onChanged?.();
    },
  });
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = password.length >= MIN_PASSWORD && confirm === password;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) change.mutate();
      }}
    >
      <div className="flex flex-wrap gap-3">
        <Field className="min-w-56 flex-1">
          <FieldLabel>New password</FieldLabel>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            aria-invalid={tooShort || undefined}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </Field>
        <Field className="min-w-56 flex-1">
          <FieldLabel>Repeat it</FieldLabel>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            aria-invalid={mismatch || undefined}
            onChange={(e) => {
              setConfirm(e.target.value);
            }}
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {mismatch
          ? "The two passwords are different."
          : `At least ${String(MIN_PASSWORD)} characters.`}
      </p>
      {change.isError ? (
        <Alert variant="error" role="alert">
          <AlertDescription>{change.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Button type="submit" disabled={!ready || change.isPending}>
          {change.isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
