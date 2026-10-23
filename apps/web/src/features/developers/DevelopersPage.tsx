import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpenIcon } from "lucide-react";

import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Frame, FramePanel } from "@/components/ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { apiKeysQuery } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";

import { CreateKeyDialog } from "./CreateKeyDialog";
import { keyStatus, maskedKey, SCOPE_LABEL, STATUS_BADGE } from "./key-labels";
import { QuickSetup } from "./QuickSetup";
import { RevokeAllKeys } from "./RevokeAllKeys";
import { WebhooksTab } from "./Webhooks";

// Developers: API keys for machine clients, webhooks, and a quick setup that
// checks itself off (ADR-0018, ADR-0019, ADR-0021).

export function DevelopersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Developers"
        description="Connect a CRM, dialler or data warehouse to Latte with an API key and webhooks."
        actions={
          <>
            <Link to="/docs" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <BookOpenIcon aria-hidden="true" />
              Documentation
            </Link>
            <CreateKeyDialog />
          </>
        }
      />
      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTab value="keys">API keys</TabsTab>
          <TabsTab value="webhooks">Webhooks</TabsTab>
          <TabsTab value="setup">Quick setup</TabsTab>
        </TabsList>
        <TabsPanel value="keys" className="flex flex-col gap-3 pt-4">
          <div className="flex justify-end">
            <RevokeAllKeys />
          </div>
          <KeysTable />
        </TabsPanel>
        <TabsPanel value="webhooks" className="pt-4">
          <WebhooksTab />
        </TabsPanel>
        <TabsPanel value="setup" className="pt-4">
          <QuickSetup />
        </TabsPanel>
      </Tabs>
    </div>
  );
}

function KeysTable() {
  const keys = useQuery(apiKeysQuery);
  if (keys.isPending) return <Loading label="Loading API keys" shape="table" />;
  if (keys.isError) return <ErrorState error={keys.error} />;
  if (keys.data.items.length === 0) {
    return (
      <EmptyState
        title="No API keys yet"
        description="Create a key for each integration, with only the scopes it needs."
      >
        <CreateKeyDialog />
      </EmptyState>
    );
  }
  return (
    <Frame>
      <FramePanel className="overflow-x-auto p-0">
        <Table aria-label="API keys">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead className="text-end">Requests, 24 h</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.data.items.map((k) => {
              const status = keyStatus(k);
              return (
                <TableRow key={k.id}>
                  <TableCell>
                    <Link
                      to="/developers/$keyId"
                      params={{ keyId: k.id }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {k.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(k.createdAt.slice(0, 10))} · {k.createdByName}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{maskedKey(k.prefix)}</TableCell>
                  <TableCell>
                    <span className="flex max-w-72 flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <Badge key={s} variant="outline">
                          {SCOPE_LABEL[s].label}
                        </Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{k.requests24h}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {k.lastUsedAt ? formatDate(k.lastUsedAt.slice(0, 10)) : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[status].variant}>
                      {STATUS_BADGE[status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </FramePanel>
    </Frame>
  );
}
