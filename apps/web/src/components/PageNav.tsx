import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";

/** pageNumbers lists the pages to show: first, last, and two either side of the current one. */
function pageNumbers(current: number, pages: number): (number | "gap")[] {
  const shown = new Set([1, pages, current - 1, current, current + 1]);
  const out: (number | "gap")[] = [];
  for (let n = 1; n <= pages; n++) {
    if (shown.has(n)) out.push(n);
    else if (out.at(-1) !== "gap") out.push("gap");
  }
  return out;
}

/** PageNav is the numbered page bar under a table, with "41–60 of 132". */
export function PageNav({
  page,
  pageSize,
  total,
  label,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  label: string;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2">
      <p className="text-xs text-muted-foreground tabular-nums" role="status">
        {first}–{last} of {total}
      </p>
      {pages > 1 ? (
        <Pagination className="mx-0 w-auto" aria-label={label}>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => {
                  onPage(page - 1);
                }}
              >
                <ChevronLeftIcon aria-hidden="true" />
                <span className="max-sm:hidden">Previous</span>
              </Button>
            </PaginationItem>
            {pageNumbers(page, pages).map((n, i) =>
              n === "gap" ? (
                // Gaps hold no value of their own; their place is their identity.
                <PaginationItem key={`gap-${String(i)}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={n}>
                  <Button
                    variant={n === page ? "outline" : "ghost"}
                    size="icon-sm"
                    aria-label={`Page ${String(n)}`}
                    aria-current={n === page ? "page" : undefined}
                    onClick={() => {
                      onPage(n);
                    }}
                  >
                    {n}
                  </Button>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Next page"
                disabled={page >= pages}
                onClick={() => {
                  onPage(page + 1);
                }}
              >
                <span className="max-sm:hidden">Next</span>
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
