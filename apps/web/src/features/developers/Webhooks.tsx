import { WEBHOOK_EVENTS, type CreatedWebhook, type WebhookEvent } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, Loading } from "@/components/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Frame, FramePanel } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, webhooksQuery } from "@/lib/endpoints";

import { EVENT_LABEL } from "./key-labels";
import { SecretReveal } from "./SecretReveal";

// Webhooks under Developers (ADR-0021): the endpoints Latte notifies, and how
// each is doing over the last day.

type Event = Exclude<WebhookEvent, "ping">;

export function WebhooksTab() {
  const hooks = useQuery(webhooksQuery);
  if (hooks.isPending) return <Loading label="Loading webhooks" shape="table" />;
  if (hooks.isError) return <ErrorState error={hooks.error} />;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <CreateWebhookDialog />
      </div>
      {hooks.data.items.length === 0 ? (
        <EmptyState
          title="No webhooks yet"
          description="Latte posts a signed event to your endpoint when a call is scored, a batch finishes or an alert fires."
        />
      ) : (
        <Frame>
          <FramePanel className="overflow-x-auto p-0">
            <Table aria-label="Webhook endpoints">
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead className="text-end">Deliveries, 24 h</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hooks.data.items.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="max-w-80">
                      <Link
                        to="/developers/webhooks/$webhookId"
                        params={{ webhookId: h.id }}
                        className="block truncate font-mono text-xs font-medium underline-offset-4 hover:underline"
                      >
                        {h.url}
                      </Link>
                      {h.description ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {h.description}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className="flex max-w-72 flex-wrap gap-1">
                        {h.events.map((e) => (
                          <Badge key={e} variant="outline">
                            {EVENT_LABEL[e]}
                          </Badge>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {h.deliveries24h}
                      {h.failures24h > 0 ? (
                        <span className="block text-xs text-destructive-foreground">
                          {h.failures24h} failed
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {h.disabledAt ? (
                        <Badge variant="secondary">Off</Badge>
                      ) : h.consecutiveFailures > 0 ? (
                        <Badge variant="warning">Failing</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </FramePanel>
        </Frame>
      )}
    </div>
  );
}

/** CreateWebhookDialog: the URL and events, then the signing secret, shown once. */
export function CreateWebhookDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<Event[]>(["call.scored"]);
  const [created, setCreated] = useState<CreatedWebhook | null>(null);
  const create = useMutation({
    mutationFn: () => api.createWebhook({ url: url.trim(), description, events }),
    onSuccess: async (result) => {
      setCreated(result);
      await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          // The secret leaves memory with the dialog.
          setCreated(null);
          setUrl("");
          setDescription("");
          setEvents(["call.scored"]);
          create.reset();
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon aria-hidden="true" />
        Add endpoint
      </DialogTrigger>
      <DialogPopup>
        {created ? (
          <SecretReveal
            title="Copy the signing secret"
            description="Your endpoint uses it to check that each delivery came from Latte."
            label="Signing secret"
            secret={created.secret}
            keepNote="Latte keeps it encrypted and will not show it again. If it is lost, delete the endpoint and add it again."
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>Add a webhook endpoint</DialogTitle>
              <DialogDescription>
                An https URL on your side. Latte posts JSON with a Latte-Signature header and
                retries failures for about a day.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-4">
              <Field>
                <FieldLabel>Endpoint URL</FieldLabel>
                <Input
                  required
                  type="url"
                  placeholder="https://example.com/latte/webhooks"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                  }}
                />
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Input
                  maxLength={200}
                  placeholder="e.g. CRM sync"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                  }}
                />
              </Field>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Events</legend>
                <CheckboxGroup
                  aria-label="Events"
                  value={events}
                  onValueChange={(v: string[]) => {
                    setEvents(WEBHOOK_EVENTS.filter((e) => v.includes(e)));
                  }}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {WEBHOOK_EVENTS.map((e) => (
                    <Field key={e}>
                      <FieldItem className="flex items-center gap-2">
                        <Checkbox value={e} />
                        <FieldLabel className="font-normal">
                          {EVENT_LABEL[e]}{" "}
                          <code className="text-xs text-muted-foreground">{e}</code>
                        </FieldLabel>
                      </FieldItem>
                    </Field>
                  ))}
                </CheckboxGroup>
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
                disabled={!url.trim() || events.length === 0}
              >
                Add endpoint
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogPopup>
    </Dialog>
  );
}
