import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

// The public docs are static files the build writes into public/ (scripts/build-docs.ts),
// served by the web host, not the API: they load without a key or a session.

const docSummariesSchema = z.array(
  z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    section: z.string(),
    order: z.number(),
  }),
);

const fromSite = (path: string) => new URL(path, window.location.origin).toString();

async function fetchText(path: string): Promise<string> {
  const res = await fetch(fromSite(path));
  if (!res.ok) throw new Error(`could not load ${path} (${String(res.status)})`);
  return res.text();
}

export const docPagesQuery = queryOptions({
  queryKey: ["docs", "pages"],
  queryFn: async () => docSummariesSchema.parse(JSON.parse(await fetchText("/docs/pages.json"))),
  staleTime: Infinity,
});

export const docPageQuery = (slug: string) =>
  queryOptions({
    queryKey: ["docs", "page", slug],
    queryFn: () => fetchText(`/docs/${slug}.md`),
    staleTime: Infinity,
  });
