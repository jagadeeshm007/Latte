import type { Rubric } from "@scc/shared";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const VERSIONS_PER_PAGE = 5;

/** matches finds a version by its number ("3", "v3") or by a word of its name. */
function matches(r: Rubric, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const number = q.replace(/^v/, "");
  return String(r.version) === number || r.name.toLowerCase().includes(q);
}

/**
 * RubricVersions lists every saved version, newest first, with search and
 * pages of five. Choosing one shows its items; the active one is marked.
 */
export function RubricVersions({
  versions,
  selectedId,
  onSelect,
}: {
  versions: Rubric[];
  selectedId: string;
  onSelect: (rubric: Rubric) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const found = [...versions]
    .sort((a, b) => b.version - a.version)
    .filter((r) => matches(r, query));
  const pages = Math.max(1, Math.ceil(found.length / VERSIONS_PER_PAGE));
  // A search that shrinks the list never leaves the reader on an empty page.
  const current = Math.min(page, pages);
  const shown = found.slice((current - 1) * VERSIONS_PER_PAGE, current * VERSIONS_PER_PAGE);

  return (
    <Frame role="region" aria-labelledby="versions-heading">
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3">
        <FrameTitle role="heading" aria-level={2} id="versions-heading">
          Versions <span className="font-normal text-muted-foreground">({versions.length})</span>
        </FrameTitle>
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            size="sm"
            type="search"
            aria-label="Search versions"
            placeholder="Search by name or v3"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </InputGroup>
      </FrameHeader>
      <FramePanel className="p-0">
        {shown.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">No version matches.</p>
        ) : (
          <ul className="divide-y" aria-label="Rubric versions">
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  aria-current={r.id === selectedId ? "true" : undefined}
                  onClick={() => {
                    onSelect(r);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors outline-none hover:bg-muted focus-visible:bg-muted",
                    r.id === selectedId && "bg-accent",
                  )}
                >
                  <span className="w-10 font-mono font-medium tabular-nums">v{r.version}</span>
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {r.items.length} items · {formatDate(r.createdAt)}
                  </span>
                  {r.isActive ? <Badge variant="success">Active</Badge> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 ? (
          <Pagination className="border-t px-4 py-2" aria-label="Version pages">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Previous page"
                  disabled={current === 1}
                  onClick={() => {
                    setPage(current - 1);
                  }}
                >
                  <ChevronLeftIcon aria-hidden="true" />
                  Previous
                </Button>
              </PaginationItem>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <PaginationItem key={n}>
                  <Button
                    variant={n === current ? "outline" : "ghost"}
                    size="icon-sm"
                    aria-label={`Page ${String(n)}`}
                    aria-current={n === current ? "page" : undefined}
                    onClick={() => {
                      setPage(n);
                    }}
                  >
                    {n}
                  </Button>
                </PaginationItem>
              ))}
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Next page"
                  disabled={current === pages}
                  onClick={() => {
                    setPage(current + 1);
                  }}
                >
                  Next
                  <ChevronRightIcon aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </FramePanel>
    </Frame>
  );
}
