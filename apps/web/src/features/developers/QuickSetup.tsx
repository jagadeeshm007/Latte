import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { apiKeysQuery, webhooksQuery } from "@/lib/endpoints";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

import { CodeBlock } from "./CodeBlock";

// Quick setup: four steps from nothing to a working integration. Each step
// ticks itself off from what Latte can see (a key exists, a key was used, a
// webhook exists, a delivery got through), so it doubles as a health check.

interface Step {
  title: string;
  done: boolean;
  body: ReactNode;
}

export function QuickSetup() {
  const keys = useQuery(apiKeysQuery);
  const hooks = useQuery(webhooksQuery);
  const base = env.VITE_API_URL || window.location.origin;
  const live = (keys.data?.items ?? []).filter((k) => !k.revokedAt);
  const endpoints = hooks.data?.items ?? [];
  const steps: Step[] = [
    {
      title: "Create an API key",
      done: live.length > 0,
      body: (
        <p>
          Use <strong>Create API key</strong> above. Give it only the scopes the integration needs,
          and store it in your secret manager as <code>LATTE_API_KEY</code>.
        </p>
      ),
    },
    {
      title: "Make your first request",
      done: live.some((k) => k.lastUsedAt !== null),
      body: (
        <CodeBlock
          label="Who am I"
          code={`curl ${base}/api/me \\\n  -H "Authorization: Bearer $LATTE_API_KEY"`}
        />
      ),
    },
    {
      title: "Add a webhook endpoint",
      done: endpoints.length > 0,
      body: (
        <p>
          On the <strong>Webhooks</strong> tab, add an https URL and pick events. Check each
          delivery's <code>Latte-Signature</code> with <code>verifyWebhookSignature</code> from the
          SDK.
        </p>
      ),
    },
    {
      title: "Receive an event",
      done: endpoints.some((e) => e.deliveries24h > e.failures24h),
      body: (
        <p>
          Open the endpoint and press <strong>Send test event</strong>. A ping arrives within a
          minute; its delivery shows as Delivered.
        </p>
      ),
    },
  ];
  const finished = steps.filter((s) => s.done).length;

  return (
    <Frame role="region" aria-labelledby="setup-heading">
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <FrameTitle role="heading" aria-level={2} id="setup-heading">
            Quick setup
          </FrameTitle>
          <FrameDescription>
            {finished} of {steps.length} done. Full guide in the{" "}
            <Link
              to="/docs"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              documentation
            </Link>
            .
          </FrameDescription>
        </div>
      </FrameHeader>
      <FramePanel className="p-0">
        <ol className="divide-y">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3 px-4 py-4">
              {s.done ? (
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-success-foreground"
                />
              ) : (
                <CircleIcon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
                <p className={cn("font-medium", s.done && "text-muted-foreground")}>
                  {i + 1}. {s.title}
                  <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
                </p>
                {s.done ? null : <div className="text-muted-foreground">{s.body}</div>}
              </div>
            </li>
          ))}
        </ol>
      </FramePanel>
    </Frame>
  );
}
