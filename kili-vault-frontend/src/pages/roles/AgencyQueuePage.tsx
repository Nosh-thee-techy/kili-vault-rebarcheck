import { AgencyVerificationCard } from '@/components/dashboard/AgencyVerificationCard';
import { PageHero } from '@/components/dashboard/PageHero';
import { CaseListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCasesQuery } from '@/hooks/useCaseQueries';

export function AgencyQueuePage() {
  const { data, isLoading } = useCasesQuery({ limit: 50 });
  const queue = (data?.data ?? []).filter(
    (c) => c.status === 'AGENCY_PENDING' || c.status === 'EVIDENCE_SUBMITTED',
  );

  const totalEvidence = queue.reduce((sum, c) => sum + (c.evidenceItems?.length ?? 0), 0);

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHero
        eyebrow="NCWSC · Simulated verifier"
        title="Verification desk"
        description="Formal sign-off layer — review evidence packs and return authoritative approve/reject decisions. Kili-Vault tracks; you verify."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-forest/15 bg-forest/5 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-forest">Pending review</p>
          <p className="mt-1 font-display text-3xl font-bold text-charcoal">{queue.length}</p>
        </div>
        <div className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
            Evidence items
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-charcoal">{totalEvidence}</p>
        </div>
      </div>

      {isLoading ? (
        <CaseListSkeleton count={3} />
      ) : queue.length === 0 ? (
        <EmptyState
          title="Verification queue is clear"
          description="When planners route cases for agency review, they will appear here with full evidence packs."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {queue.map((c) => (
            <AgencyVerificationCard key={c.id} caseItem={c} />
          ))}
        </div>
      )}
    </div>
  );
}
