import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDashed, ClipboardCheck } from 'lucide-react';
import { CaseListItem } from '@/components/cases/CaseListItem';
import { DeveloperActionCard } from '@/components/dashboard/DeveloperActionCard';
import { PageHero } from '@/components/dashboard/PageHero';
import { CaseListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCasesQuery } from '@/hooks/useCaseQueries';

export function DeveloperHomePage() {
  const { data, isLoading } = useCasesQuery({ limit: 50 });
  const cases = data?.data ?? [];
  const actionRequired = cases.filter((c) => c.status === 'MITIGATION_REQUIRED');
  const inProgress = cases.filter(
    (c) => c.status === 'EVIDENCE_SUBMITTED' || c.status === 'AGENCY_PENDING',
  );
  const completed = cases.filter((c) => c.status === 'VERIFIED' || c.status === 'CLOSED');

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHero
        eyebrow="Compliance workspace"
        title="My development cases"
        description="Plain-language view of what you owe, what you've submitted, and where verification stands — no GIS jargon required."
        action={
          <Link
            to="/developer/check"
            className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-forest/20 bg-off-white px-5 text-sm font-semibold text-forest transition-colors hover:border-forest/40 hover:bg-sand/50"
          >
            <ClipboardCheck className="h-4 w-4" />
            Check a plot
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Action required', value: actionRequired.length, icon: CircleDashed, tone: 'text-clay-dark bg-clay/10' },
          { label: 'In verification', value: inProgress.length, icon: CircleDashed, tone: 'text-forest bg-forest/10' },
          { label: 'Completed', value: completed.length, icon: CheckCircle2, tone: 'text-risk-low bg-risk-low/10' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-sand bg-off-white p-4 shadow-soft">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${tone}`}>
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <p className="font-display text-2xl font-bold tabular-nums text-charcoal">{value}</p>
            <p className="mt-1 text-xs font-medium text-charcoal-muted">{label}</p>
          </div>
        ))}
      </div>

      {actionRequired.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-charcoal">
            Respond now
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {actionRequired.map((c) => (
              <DeveloperActionCard key={c.id} caseItem={c} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-charcoal">All assigned cases</h2>
        {isLoading ? (
          <CaseListSkeleton count={4} />
        ) : cases.length === 0 ? (
          <EmptyState
            title="No assigned cases"
            description="When a planner assigns mitigation to your developments, they will appear here."
          />
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <CaseListItem key={c.id} caseItem={c} caseLinkPrefix="/developer/cases" />
            ))}
          </div>
        )}
      </section>

      {inProgress.length > 0 && (
        <p className="text-center text-xs text-charcoal-muted">
          {inProgress.length} case(s) awaiting agency verification —{' '}
          <Link to={`/developer/cases/${inProgress[0].id}`} className="font-semibold text-forest">
            track status
          </Link>
        </p>
      )}
    </div>
  );
}
