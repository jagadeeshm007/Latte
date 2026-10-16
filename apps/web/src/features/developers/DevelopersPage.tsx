import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLinkIcon } from "lucide-react";

import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
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
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";

import { CreateKeyDialog } from "./CreateKeyDialog";
import { keyStatus, maskedKey, SCOPE_LABEL, STATUS_BADGE } from "./key-labels";

// Developers: API keys for machine clients, with their traffic, and a quick
// start for the API and the SDK (ADR-0018, ADR-0019).

export function DevelopersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Developers"
        description="Connect a CRM, dialler or data warehouse to Latte with an API key."
        actions={<CreateKeyDialog />}
      />
      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTab value="keys">API keys</TabsTab>
          <TabsTab value="quickstart">Quick start</TabsTab>
        </TabsList>
        <TabsPanel value="keys" className="pt-4">
          <KeysTable />
        </TabsPanel>
        <TabsPanel value="quickstart" className="pt-4">
          <QuickStart />
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

function Snippet({ label, code }: { label: string; code: string }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-xs font-medium text-muted-foreground">{label}</figcaption>
      <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

function QuickStart() {
  const base = env.VITE_API_URL;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Frame>
        <FrameHeader className="px-4 py-3">
          <FrameTitle>With curl</FrameTitle>
          <FrameDescription>Every request sends the key as a bearer token.</FrameDescription>
        </FrameHeader>
        <FramePanel className="flex flex-col gap-4 px-4 py-3">
          <Snippet
            label="List the latest calls"
            code={`curl ${base}/api/calls?limit=10 \\\n  -H "Authorization: Bearer $LATTE_API_KEY"`}
          />
          <Snippet
            label="Download a batch's results"
            code={`curl -OJ ${base}/api/batches/$BATCH_ID/results.csv \\\n  -H "Authorization: Bearer $LATTE_API_KEY"`}
          />
        </FramePanel>
      </Frame>
      <Frame>
        <FrameHeader className="px-4 py-3">
          <FrameTitle>With the TypeScript SDK</FrameTitle>
          <FrameDescription>
            Retries rate limits for you and uploads batches in chunks.
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="flex flex-col gap-4 px-4 py-3">
          <Snippet
            label="Upload a day of calls and wait for the results"
            code={`import { LatteClient } from "@latte/sdk";

const latte = new LatteClient({
  apiKey: process.env.LATTE_API_KEY!,
  baseUrl: "${base}",
});

const batch = await latte.batches.create(files, { name: "Inbound, 16 Oct" });
const done = await latte.batches.wait(batch.batchId!);
console.log(done.scored, "scored,", done.flagged, "flagged");`}
          />
        </FramePanel>
      </Frame>
      <Frame className="lg:col-span-2">
        <FramePanel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <span>
            Limits are per key and bucket. Each response carries <code>RateLimit-Remaining</code>; a{" "}
            <code>429</code> carries <code>Retry-After</code>.
          </span>
          <a
            href={`${base}/api/openapi.json`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            OpenAPI reference
            <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
          </a>
        </FramePanel>
      </Frame>
    </div>
  );
}
