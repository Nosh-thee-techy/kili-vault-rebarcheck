import { ChevronLeft, ChevronRight, Radar } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CaseListSkeleton } from '@/components/ui/Skeleton';
import { useDetectionsQuery } from '@/hooks/useDetectionQueries';
import { formatArea, formatChangeType, formatConfidence, formatRelativeDate } from '@/lib/format';

function number(value: number | null | undefined, digits = 2) {
  return value == null || !Number.isFinite(value) ? 'Not available' : value.toFixed(digits);
}

export function DetectionTriageList() {
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const query = useDetectionsQuery(page, pageSize, 0.5);
  const total = query.data?.pagination.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const detections = query.data?.data ?? [];

  return (
    <section className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sage">AI-assisted triage</p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-charcoal"><Radar className="h-5 w-5 text-clay" /> Observed spatial change</h2>
          <p className="mt-1 text-sm text-charcoal-muted">Page through candidate detections before promoting them into human-reviewed development cases.</p>
        </div>
        <span className="text-xs font-semibold text-charcoal-muted">{total.toLocaleString()} candidates · confidence ≥ 50%</span>
      </div>
      {query.isLoading ? <div className="mt-5"><CaseListSkeleton count={4} /></div> : detections.length === 0 ? <div className="mt-5"><EmptyState title="No detections available" description="The detection engine has not returned candidates for this filter." /></div> : <div className="mt-5 space-y-2">{detections.map((detection) => <article key={detection.id} className="rounded-xl border border-sand p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-charcoal">{formatChangeType(detection.change_type)}</p><p className="mt-0.5 truncate font-mono text-[11px] text-charcoal-muted">{detection.id}</p></div><span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-bold text-clay-dark">{formatConfidence(detection.confidence)}</span></div><dl className="mt-3 grid gap-2 text-xs sm:grid-cols-4"><div><dt className="text-charcoal-muted">Observed area</dt><dd className="font-semibold text-charcoal">{formatArea(detection.area_m2 ?? 0)}</dd></div><div><dt className="text-charcoal-muted">NDBI change</dt><dd className="font-semibold text-charcoal">{number(detection.ndbi_change)}</dd></div><div><dt className="text-charcoal-muted">Persistence</dt><dd className="font-semibold text-charcoal">{detection.temporal_persistence == null ? 'Not available' : formatConfidence(detection.temporal_persistence)}</dd></div><div><dt className="text-charcoal-muted">Detected</dt><dd className="font-semibold text-charcoal">{detection.created_at ? formatRelativeDate(detection.created_at) : 'Not available'}</dd></div></dl><p className="mt-2 text-[11px] leading-relaxed text-charcoal-muted">Candidate spatial change, not a legal conclusion. Review geometry and evidence on the map before promotion.</p></article>)}</div>}
      <div className="mt-4 flex items-center justify-between border-t border-sand pt-4"><span className="text-xs text-charcoal-muted">Page {page + 1} of {pageCount}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0 || query.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))} aria-label="Previous detection page"><ChevronLeft className="h-4 w-4" /> Previous</Button><Button variant="outline" size="sm" disabled={page >= pageCount - 1 || query.isFetching} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} aria-label="Next detection page">Next <ChevronRight className="h-4 w-4" /></Button></div></div>
    </section>
  );
}