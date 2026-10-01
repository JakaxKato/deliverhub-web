import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-lg bg-surface-raised border border-border/60 overflow-hidden relative",
        "after:absolute after:inset-0 after:content-['']",
        "after:bg-[linear-gradient(100deg,transparent_30%,color-mix(in_oklab,var(--foreground)_6%,transparent)_50%,transparent_70%)]",
        "after:bg-[length:200%_100%] after:animate-[nw-shimmer_1.6s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}

export function BoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
      {[0, 1, 2, 3].map((col) => (
        <div key={col} className="rounded-xl border border-border bg-surface/60 p-4 min-h-[420px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="rounded-xl border border-border bg-surface p-4 space-y-2.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface/60 overflow-hidden">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
