import {
  API_BUCKETS,
  API_SCOPES,
  DEFAULT_BUCKET_LIMITS,
  MAX_BUCKET_LIMITS,
  type ApiScope,
  type BucketLimits,
  type CreatedApiKey,
} from "@scc/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, KeyRoundIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
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
import { Field, FieldItem, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { api } from "@/lib/endpoints";

import { BUCKET_LABEL, SCOPE_LABEL } from "./key-labels";

const EXPIRY = [
  { value: "never", label: "Never (until revoked)" },
  { value: "30", label: "In 30 days" },
  { value: "90", label: "In 90 days" },
  { value: "365", label: "In a year" },
];

/**
 * CreateKeyDialog: name the key, pick its scopes, expiry and limits; then
 * show the secret once, with a copy button, because it is never shown again.
 */
export function CreateKeyDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>(["calls:read"]);
  const [expiry, setExpiry] = useState("never");
  const [limits, setLimits] = useState<BucketLimits>({});
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const create = useMutation({
    mutationFn: () =>
      api.createApiKey({
        name: name.trim(),
        scopes,
        expiresInDays: expiry === "never" ? null : Number(expiry),
        limits,
      }),
    onSuccess: async (result) => {
      setCreated(result);
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  function reset(next: boolean) {
    setOpen(next);
    if (next) return;
    // The secret leaves memory with the dialog.
    setCreated(null);
    setCopied(false);
    setName("");
    setScopes(["calls:read"]);
    setExpiry("never");
    setLimits({});
    create.reset();
  }

  async function copy(secret: string) {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon aria-hidden="true" />
        Create API key
      </DialogTrigger>
      <DialogPopup>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your API key</DialogTitle>
              <DialogDescription>
                {created.key.name}: store it in your secret manager now.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-3">
              <Alert variant="warning">
                <TriangleAlertIcon aria-hidden="true" />
                <AlertTitle>Shown once</AlertTitle>
                <AlertDescription>
                  Latte keeps only a hash. If the key is lost, revoke it and create another.
                </AlertDescription>
              </Alert>
              <InputGroup>
                <InputGroupAddon>
                  <KeyRoundIcon aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  readOnly
                  aria-label="New API key"
                  value={created.secret}
                  className="font-mono text-xs"
                  onFocus={(e) => {
                    e.currentTarget.select();
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <Button size="xs" variant="ghost" onClick={() => void copy(created.secret)}>
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
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                The key acts as you, limited to the scopes you pick. Give it only what the
                integration needs.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-5">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  required
                  maxLength={80}
                  placeholder="e.g. CRM sync"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                />
              </Field>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Scopes</legend>
                <CheckboxGroup
                  aria-label="Scopes"
                  value={scopes}
                  onValueChange={(v: string[]) => {
                    setScopes(API_SCOPES.filter((s) => v.includes(s)));
                  }}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {API_SCOPES.map((s) => (
                    <Field key={s}>
                      <FieldItem className="flex items-start gap-2">
                        <Checkbox value={s} className="mt-0.5" />
                        <FieldLabel className="flex flex-col items-start gap-0 font-normal">
                          <span className="font-medium">{SCOPE_LABEL[s].label}</span>
                          <span className="text-xs text-muted-foreground">
                            {SCOPE_LABEL[s].hint}
                          </span>
                        </FieldLabel>
                      </FieldItem>
                    </Field>
                  ))}
                </CheckboxGroup>
              </fieldset>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Expires</span>
                <OptionSelect
                  label="Expires"
                  value={expiry}
                  options={EXPIRY}
                  onChange={setExpiry}
                />
              </div>
              <fieldset className="grid grid-cols-2 gap-3">
                <legend className="mb-2 text-sm font-medium">Rate limits</legend>
                {API_BUCKETS.map((b) => (
                  <Field key={b}>
                    <FieldLabel className="text-xs font-normal text-muted-foreground">
                      {BUCKET_LABEL[b].label}, {BUCKET_LABEL[b].per}
                    </FieldLabel>
                    <Input
                      type="number"
                      size="sm"
                      min={1}
                      max={MAX_BUCKET_LIMITS[b]}
                      placeholder={String(DEFAULT_BUCKET_LIMITS[b])}
                      value={limits[b] ?? ""}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        const value = e.target.value !== "" && Number.isInteger(n) ? n : undefined;
                        setLimits((current) => {
                          // Rebuilt rather than mutated: an empty box goes back to the default.
                          const next: BucketLimits = {};
                          for (const k of API_BUCKETS) {
                            const v = k === b ? value : current[k];
                            if (v !== undefined) next[k] = v;
                          }
                          return next;
                        });
                      }}
                    />
                  </Field>
                ))}
              </fieldset>
              {create.isError ? (
                <Alert variant="error" role="alert">
                  <AlertDescription>{create.error.message}</AlertDescription>
                </Alert>
              ) : null}
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" type="button" />}>Cancel</DialogClose>
              <Button
                type="submit"
                loading={create.isPending}
                disabled={!name.trim() || scopes.length === 0}
              >
                Create key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogPopup>
    </Dialog>
  );
}
