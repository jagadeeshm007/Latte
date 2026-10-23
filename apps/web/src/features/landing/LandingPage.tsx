import { LANGUAGES } from "@scc/shared";
import { Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  AudioLinesIcon,
  BookOpenIcon,
  CodeIcon,
  GaugeIcon,
  InboxIcon,
  LanguagesIcon,
  LockKeyholeIcon,
  ScanSearchIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/features/developers/CodeBlock";

/** The source repository; the landing page and footer link to it. */
export const REPOSITORY_URL = "https://github.com/jagadeeshm007/Latte";

const SPOKEN = LANGUAGES.filter((l) => l.code !== "auto");

const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <ScanSearchIcon aria-hidden="true" />,
    title: "Every call checked",
    body: "Each call is scored against your compliance and quality rubric, with the exact lines that prove every finding.",
  },
  {
    icon: <InboxIcon aria-hidden="true" />,
    title: "A review queue for QA",
    body: "Calls with a breach or a missed must-say go to QA, who play each finding from its moment and agree or correct it.",
  },
  {
    icon: <LanguagesIcon aria-hidden="true" />,
    title: `${String(SPOKEN.length)} languages`,
    body: `${SPOKEN.map((l) => l.label).join(", ")}. Regional calls are translated before scoring.`,
  },
  {
    icon: <AudioLinesIcon aria-hidden="true" />,
    title: "Coaching, not just policing",
    body: "Agents see their own scorecard and coaching points; managers see who needs help on what.",
  },
  {
    icon: <GaugeIcon aria-hidden="true" />,
    title: "Trends and alerts",
    body: "Scores and flags by team, product and agent, alerts when a flag rate jumps, and daily or weekly digests.",
  },
  {
    icon: <CodeIcon aria-hidden="true" />,
    title: "Built to connect",
    body: "A REST API with scoped keys, signed webhooks, and SDKs for TypeScript, Python, Go and Java.",
  },
];

const STEPS = [
  ["Upload", "Stereo recordings, or transcripts from your dialler."],
  ["Transcribe", "Each speaker separately, word by word, in their language."],
  ["Score", "Rule checks plus one AI judge call per call, citing transcript lines."],
  ["Review", "Flagged calls reach QA; results feed scorecards and the dashboard."],
] as const;

const SDK_SAMPLE = `import { LatteClient } from "@latte/sdk";

const latte = new LatteClient({ apiKey: process.env.LATTE_API_KEY!, baseUrl: "https://your-latte-domain" });

const batch = await latte.batches.create(files, { name: "Inbound, week 42" });
const done = await latte.batches.wait(batch.batchId!);
console.log(done.scored, "scored,", done.flagged, "flagged");`;

/** LandingPage: what Latte is, for someone not signed in. */
export function LandingPage() {
  useEffect(() => {
    document.title = "Latte · Sales call compliance and coaching";
  }, []);
  return (
    <div className="flex flex-col gap-16 pb-8">
      <section
        aria-labelledby="hero-heading"
        className="flex flex-col items-start gap-5 pt-6 md:pt-12"
      >
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Open source, MIT licensed
        </span>
        <h1
          id="hero-heading"
          className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-balance md:text-5xl"
        >
          Every sales call checked against your rubric
        </h1>
        <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
          Most teams can only spot-check a sample of their calls. Latte transcribes and scores all
          of them, sends the risky ones to QA with playable evidence, and turns the rest into
          coaching.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" render={<Link to="/sign-in" />}>
            Sign in
            <ArrowRightIcon aria-hidden="true" />
          </Button>
          <Button size="lg" variant="outline" render={<Link to="/docs" />}>
            <BookOpenIcon aria-hidden="true" />
            Read the docs
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Access is by invitation from your organisation's manager.
        </p>
      </section>

      <section aria-labelledby="how-heading" className="flex flex-col gap-4">
        <h2 id="how-heading" className="font-heading text-2xl font-semibold">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex flex-col gap-1 rounded-xl border p-4">
              <span className="text-xs font-medium text-muted-foreground">
                Step {String(i + 1)}
              </span>
              <span className="font-medium">{title}</span>
              <span className="text-sm text-muted-foreground">{body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features-heading" className="flex flex-col gap-4">
        <h2 id="features-heading" className="font-heading text-2xl font-semibold">
          What you get
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand [&_svg]:size-4">
                  {f.icon}
                </span>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="developers-heading"
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
      >
        <div className="flex flex-col gap-3">
          <h2 id="developers-heading" className="font-heading text-2xl font-semibold">
            For developers
          </h2>
          <p className="text-muted-foreground">
            Push calls in from a dialler, pull scores into a CRM, or get a signed webhook the moment
            a call is scored. The docs are public and readable by LLMs.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
            <Link
              to="/docs/$page"
              params={{ page: "quickstart" }}
              className="underline-offset-4 hover:underline"
            >
              Quickstart
            </Link>
            <Link
              to="/docs/$page"
              params={{ page: "sdks" }}
              className="underline-offset-4 hover:underline"
            >
              SDKs
            </Link>
            <Link
              to="/docs/$page"
              params={{ page: "webhooks" }}
              className="underline-offset-4 hover:underline"
            >
              Webhooks
            </Link>
            <a href="/llms.txt" className="underline-offset-4 hover:underline">
              llms.txt
            </a>
          </div>
        </div>
        <CodeBlock label="TypeScript" code={SDK_SAMPLE} />
      </section>

      <section
        aria-labelledby="privacy-heading"
        className="flex flex-col gap-4 rounded-2xl border p-6"
      >
        <h2
          id="privacy-heading"
          className="flex items-center gap-2 font-heading text-xl font-semibold [&_svg]:size-5"
        >
          <LockKeyholeIcon aria-hidden="true" />
          Customer data stays protected
        </h2>
        <ul className="grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li>
            Card, Aadhaar, PAN, phone and account numbers are masked in views, exports and the API.
          </li>
          <li>Invite-only access with roles, and sign-in with Google, Microsoft or SAML.</li>
          <li>Database, storage and API hosted in Mumbai, with row-level security.</li>
          <li>Recordings deleted on your schedule; every recording played is audited.</li>
        </ul>
        <p className="text-sm">
          <Link
            to="/legal/$page"
            params={{ page: "privacy" }}
            className="font-medium underline-offset-4 hover:underline"
          >
            Privacy policy
          </Link>
          <span className="text-muted-foreground"> · </span>
          <Link
            to="/legal/$page"
            params={{ page: "subprocessors" }}
            className="font-medium underline-offset-4 hover:underline"
          >
            Subprocessors
          </Link>
        </p>
      </section>

      <section aria-labelledby="open-heading" className="flex flex-col items-start gap-3">
        <h2 id="open-heading" className="font-heading text-xl font-semibold">
          Open source
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          The whole application, from the scoring pipeline to these pages, is on GitHub under the
          MIT licence. Run it yourself with Docker and one model key.
        </p>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          View on GitHub
        </a>
      </section>
    </div>
  );
}
