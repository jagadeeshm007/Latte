import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { BotIcon, FileTextIcon } from "lucide-react";
import { useEffect } from "react";

import { ErrorState, Loading } from "@/components/states";
import { sections } from "@/lib/docs-build";

import { docPageQuery, docPagesQuery } from "./docs-queries";
import { Markdown } from "./Markdown";

/**
 * DocsPage: the public API, webhook and SDK docs. Pages come from
 * docs/public through the build; only listed pages are fetched, so an
 * unknown name is a not-found here rather than the app's own index.html.
 */
export function DocsPage({ slug }: { slug: string }) {
  const pages = useQuery(docPagesQuery);
  const current = pages.data?.find((p) => p.slug === slug);
  const page = useQuery({ ...docPageQuery(slug), enabled: current !== undefined });
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    if (current) document.title = `${current.title} · Latte docs`;
  }, [current]);
  useEffect(() => {
    // The page arrives after navigation, so the router's own scroll to the anchor finds nothing yet.
    if (page.data && hash) document.getElementById(hash)?.scrollIntoView();
  }, [page.data, hash]);

  if (pages.isPending) return <Loading label="Loading the docs" />;
  if (pages.isError) return <ErrorState error={pages.error} title="The docs could not be loaded" />;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav aria-label="Docs" className="flex flex-col gap-4 text-sm lg:sticky lg:top-20">
        {sections(pages.data).map(([section, group]) => (
          <div key={section} className="flex flex-col gap-1">
            <span className="px-2 text-xs font-medium text-muted-foreground">{section}</span>
            {group.map((p) => (
              <Link
                key={p.slug}
                to="/docs/$page"
                params={{ page: p.slug }}
                className="rounded-md px-2 py-1 text-foreground/80 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                activeProps={{ className: "bg-accent font-medium text-foreground" }}
                aria-current={p.slug === slug ? "page" : undefined}
              >
                {p.title}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <article
        aria-label={current?.title ?? "Page not found"}
        className="flex min-w-0 flex-col gap-4"
      >
        {current ? (
          <>
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <a
                href={`/docs/${slug}.md`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <FileTextIcon aria-hidden="true" className="size-3.5" />
                View as Markdown
              </a>
              <a href="/llms.txt" className="inline-flex items-center gap-1 hover:text-foreground">
                <BotIcon aria-hidden="true" className="size-3.5" />
                llms.txt
              </a>
            </div>
            {page.isPending ? (
              <Loading label={`Loading ${current.title}`} />
            ) : page.isError ? (
              <ErrorState error={page.error} title={`${current.title} could not be loaded`} />
            ) : (
              <Markdown source={page.data} />
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-semibold">Page not found</h1>
            <p className="text-sm text-muted-foreground">
              There is no docs page called “{slug}”.{" "}
              <Link to="/docs" className="underline underline-offset-4">
                Back to the overview
              </Link>
            </p>
          </div>
        )}
      </article>
    </div>
  );
}
