import {
  API_SCOPES,
  BUCKET_WINDOW_SECONDS,
  DEFAULT_BUCKET_LIMITS,
  API_BUCKETS,
  WEBHOOK_EVENTS,
} from "@scc/shared";
import { ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/states";
import { Frame, FramePanel } from "@/components/ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { env } from "@/lib/env";

import { CodeBlock } from "./CodeBlock";
import { BUCKET_LABEL, EVENT_LABEL, SCOPE_LABEL } from "./key-labels";

/** The pinned SDK release; sdk-release.yml attaches it to the GitHub release for its tag. */
const SDK_TARBALL =
  "https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.2.0/latte-sdk-0.2.0.tgz";

// The Latte API and SDK documentation, in the app so it always matches the
// running version: scopes, limits and events come from the shared contract.

const SECTIONS = [
  ["start", "Getting started"],
  ["auth", "Authentication and scopes"],
  ["limits", "Rate limits"],
  ["errors", "Errors and request ids"],
  ["idempotency", "Idempotency"],
  ["pagination", "Pagination"],
  ["uploads", "Uploading calls and batches"],
  ["webhooks", "Webhooks"],
  ["sdk", "SDK reference"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="flex scroll-mt-6 flex-col gap-3" id={id}>
      <h2 id={`${id}-heading`} className="font-heading text-lg font-semibold">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-px [&_code]:text-foreground [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function DocsPage() {
  const base = env.VITE_API_URL || window.location.origin;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API and SDK documentation"
        description="Everything an integration needs: authentication, limits, errors, uploads, webhooks and the TypeScript SDK."
        actions={
          <a
            href={`${base}/api/openapi.json`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            OpenAPI reference
            <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
          </a>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-6">
          <ol className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm lg:flex-col">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-muted-foreground hover:text-foreground">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <Frame>
          <FramePanel className="flex flex-col gap-10 px-6 py-6">
            <Section id="start" title="Getting started">
              <p>
                Create a key under <strong>Developers</strong>, then call the API from your server.
                Never put a key in a browser or a mobile app.
              </p>
              <p>
                The SDK has no dependencies and runs on Node 20 or later, Bun, Deno and edge
                runtimes. Install a release straight from GitHub with npm, pnpm or yarn:
              </p>
              <CodeBlock label="Install the SDK" code={`npm install ${SDK_TARBALL}`} />
              <CodeBlock
                label="First call"
                code={`import { LatteClient } from "@latte/sdk";

const latte = new LatteClient({ apiKey: process.env.LATTE_API_KEY!, baseUrl: "${base}" });
const me = await latte.me(); // the manager the key acts as`}
              />
            </Section>

            <Section id="auth" title="Authentication and scopes">
              <p>
                Send the key as a bearer token: <code>Authorization: Bearer latte_…</code>. A key
                acts as the manager who created it, limited to its scopes. It stops working when
                revoked, when it expires, or when its creator is no longer a manager. Routes a key
                may not use answer <code>403 not_for_api_keys</code>; a missing scope answers{" "}
                <code>403 insufficient_scope</code>.
              </p>
              <Table aria-label="Scopes">
                <TableHeader>
                  <TableRow>
                    <TableHead>Scope</TableHead>
                    <TableHead>Allows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {API_SCOPES.map((s) => (
                    <TableRow key={s}>
                      <TableCell className="font-mono text-xs">{s}</TableCell>
                      <TableCell>{SCOPE_LABEL[s].hint}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p>
                Rotate a key to replace it without downtime: the old key keeps working for 24 hours.
              </p>
            </Section>

            <Section id="limits" title="Rate limits">
              <p>
                Each key has a limit per bucket and window. Every response carries{" "}
                <code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code> and{" "}
                <code>RateLimit-Reset</code> (seconds). Over the limit, the API answers{" "}
                <code>429</code> with <code>Retry-After</code>; the SDK waits and retries for you.
              </p>
              <Table aria-label="Default limits">
                <TableHeader>
                  <TableRow>
                    <TableHead>Bucket</TableHead>
                    <TableHead className="text-end">Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {API_BUCKETS.map((b) => (
                    <TableRow key={b}>
                      <TableCell>{BUCKET_LABEL[b].label}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {DEFAULT_BUCKET_LIMITS[b]}{" "}
                        {BUCKET_WINDOW_SECONDS[b] === 60 ? "per minute" : "per hour"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section id="errors" title="Errors and request ids">
              <p>
                Errors share one shape. Quote the <code>requestId</code> when asking for help; you
                can also send your own with <code>X-Request-Id</code>.
              </p>
              <CodeBlock
                label="Error body"
                code={`{ "error": { "code": "insufficient_scope", "message": "this API key needs the calls:write scope", "requestId": "…" } }`}
              />
            </Section>

            <Section id="idempotency" title="Idempotency">
              <p>
                Create requests (upload confirm, batch retry, webhooks, saved views, alert rules)
                accept an <code>Idempotency-Key</code>. The same key and body within 24 hours
                returns the first response with <code>Idempotent-Replayed: true</code>; the same key
                with a different body answers <code>422</code>; one still running answers{" "}
                <code>409</code>. The SDK sets a key on every upload confirm, so retries never
                create calls twice.
              </p>
            </Section>

            <Section id="pagination" title="Pagination">
              <p>
                Lists take <code>page</code> and <code>limit</code> (at most 100) and return{" "}
                <code>total</code>, so you know how many pages there are.
              </p>
            </Section>

            <Section id="uploads" title="Uploading calls and batches">
              <p>
                Uploading is three steps: sign up to 50 files, send each file straight to storage
                with the signed URL, then confirm them into a batch. Pass <code>batchId</code> to
                add more chunks to the same batch (up to 500 calls). The SDK does all of it:
              </p>
              <CodeBlock
                label="Upload a batch and wait for it"
                code={`const batch = await latte.batches.create(files, { name: "Inbound, 16 Oct", concurrency: 3 });
const done = await latte.batches.wait(batch.batchId!);
const csv = await latte.batches.resultsCsv(done.id);`}
              />
              <p>
                No recording? Upload the transcript instead: labelled text (<code>Agent:</code> /{" "}
                <code>Customer:</code>, optional <code>[00:41]</code>) or lines of{" "}
                <code>{"{ speaker, text, startMs, endMs }"}</code>. It is scored like a recording;
                without times, findings point to line numbers.
              </p>
              <CodeBlock
                label="Upload transcripts"
                code={`await latte.batches.createFromTranscripts(
  exports.map((e) => ({ originalFilename: e.name, agentId, teamId, productId, callDate: e.date, text: e.text })),
  { name: "Dialler export" },
);`}
              />
            </Section>

            <Section id="webhooks" title="Webhooks">
              <p>
                Latte posts JSON to your https endpoint and retries failures for about a day. Check
                every delivery against the raw body before you trust it:
              </p>
              <ul className="list-disc ps-5">
                {WEBHOOK_EVENTS.map((e) => (
                  <li key={e}>
                    <code>{e}</code>: {EVENT_LABEL[e]}
                  </li>
                ))}
              </ul>
              <CodeBlock
                label="Check the signature (Express)"
                code={`import { verifyWebhookSignature } from "@latte/sdk";

app.post("/latte/webhooks", express.text({ type: "application/json" }), async (req, res) => {
  const ok = await verifyWebhookSignature({
    secret: process.env.LATTE_WEBHOOK_SECRET!,
    header: req.get("Latte-Signature"),
    body: req.body,
  });
  if (!ok) return res.status(400).end();
  const event = JSON.parse(req.body); // { id, type, createdAt, data }
  res.status(204).end();
});`}
              />
              <p>
                The header is{" "}
                <code>
                  t=&lt;unix seconds&gt;,v1=&lt;hex HMAC-SHA256 of "&lt;t&gt;.&lt;body&gt;"&gt;
                </code>
                . Deliveries older than 5 minutes are refused by the helper, so a captured delivery
                cannot be replayed. Use the event <code>id</code> to drop duplicates.
              </p>
            </Section>

            <Section id="sdk" title="SDK reference">
              <Table aria-label="SDK methods">
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Does</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["latte.me()", "The manager the key acts as"],
                    [
                      "latte.calls.list(query) / get(id)",
                      "Calls, and one call with transcript and findings",
                    ],
                    ["latte.calls.upload(file, batch?)", "Upload one recording"],
                    [
                      "latte.calls.uploadTranscript(transcript, batch?)",
                      "Upload one transcript, no audio",
                    ],
                    [
                      "latte.batches.createFromTranscripts(list, opts)",
                      "Upload many transcripts as a batch",
                    ],
                    ["parseTranscript(text)", "Read labelled text or JSON into lines"],
                    [
                      "latte.calls.retry(id) / archive(id)",
                      "Queue a failed call again; hide a call",
                    ],
                    [
                      "latte.batches.create(files, opts)",
                      "Upload many recordings as one batch, in chunks",
                    ],
                    ["latte.batches.wait(id)", "Poll until no call is queued or running"],
                    [
                      "latte.batches.resultsCsv(id) / exportZip(id, parts)",
                      "Download results, transcripts, recordings",
                    ],
                    [
                      "latte.webhooks.create / list / test / deliveries / redeliver",
                      "Manage webhook endpoints",
                    ],
                    ["latte.analytics.highlights / leaderboard", "Dashboard numbers and rankings"],
                    ["verifyWebhookSignature(opts)", "Check a delivery came from Latte"],
                  ].map(([m, d]) => (
                    <TableRow key={m}>
                      <TableCell className="font-mono text-xs">{m}</TableCell>
                      <TableCell>{d}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p>
                Errors are <code>ApiError</code> (or <code>RateLimitError</code> with{" "}
                <code>retryAfterSeconds</code>) carrying the server's <code>code</code> and{" "}
                <code>requestId</code>.
              </p>
            </Section>
          </FramePanel>
        </Frame>
      </div>
    </div>
  );
}
