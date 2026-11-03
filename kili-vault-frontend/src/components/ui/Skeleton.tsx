import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-xl', className)} aria-hidden />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-sand bg-off-white p-5 md:p-6">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-2 h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function CaseListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 rounded-2xl border border-sand bg-off-white p-4 md:p-5"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl border border-sand bg-sand/40">
      <div className="absolute inset-0 map-loading-pulse bg-gradient-to-br from-mist/40 via-sand/20 to-forest/5" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest/10">
          <div className="h-7 w-7 rounded-lg border-2 border-forest/30 border-t-forest animate-spin" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-forest">Loading Kilimani map</p>
          <p className="mt-1 text-sm text-charcoal-muted">Fetching ward boundaries and layers…</p>
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}
