import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shimmering placeholders shaped like the content they stand in for, so the
// page does not jump when the data arrives. Purely visual: the Loading
// wrapper in states.tsx announces the wait to screen readers.

/** Varied line widths, so a block of placeholder text reads as text. */
const WIDTHS = ["w-11/12", "w-4/5", "w-full", "w-3/4", "w-5/6", "w-2/3"];

function Lines({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {WIDTHS.slice(0, count).map((w) => (
        <Skeleton key={w} className={cn("h-3.5", w)} />
      ))}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card p-4", className)}>{children}</div>;
}

function Header({ stats = false }: { stats?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {stats ? <Skeleton className="h-11 w-72 max-w-full rounded-lg" /> : null}
    </div>
  );
}

/** TableSkeleton: a toolbar-less list of rows, for tables inside a Frame. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_5rem] items-center gap-4 px-4 py-3.5">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-10 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

/** CardsSkeleton: a grid of summary cards. */
export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-2 w-full rounded-full" />
        </Card>
      ))}
    </div>
  );
}

/** ChartSkeleton: bars rising from a baseline. */
export function ChartSkeleton() {
  const heights = ["h-1/2", "h-3/4", "h-2/5", "h-full", "h-3/5", "h-4/5", "h-1/3"];
  return (
    <div className="flex h-48 items-end gap-3 border-b px-4 pt-4">
      {heights.map((h) => (
        <Skeleton key={h} className={cn("flex-1 rounded-b-none", h)} />
      ))}
    </div>
  );
}

/** PageSkeleton: a page header over two content cards. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Header />
      <Card className="flex flex-col gap-4">
        <Skeleton className="h-5 w-40" />
        <Lines count={4} />
      </Card>
      <Card className="p-0">
        <TableSkeleton rows={4} />
      </Card>
    </div>
  );
}

/** CallSkeleton: the call page, from the header to the findings. */
export function CallSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Header stats />
      <Card className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex items-center justify-center gap-4">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </Card>
      <Card className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className={cn("h-5", WIDTHS[i])} />
          </div>
        ))}
      </Card>
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </Card>
    </div>
  );
}

/** AppSkeleton: the shell itself (sidebar and page) while the session loads. */
export function AppSkeleton() {
  return (
    <div className="grid min-h-svh md:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="hidden flex-col gap-3 border-e p-4 md:flex">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-9 w-full rounded-lg" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
      <div className="px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-7xl">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}

/** TextSkeleton: a few lines of text, for small panels. */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return <Lines count={lines} />;
}
