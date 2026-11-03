import { useState } from 'react';
import { CaseFiltersBar } from '@/components/cases/CaseFiltersBar';
import { CaseListItem } from '@/components/cases/CaseListItem';
import { CasesTable } from '@/components/cases/CasesTable';
import { PageHero } from '@/components/dashboard/PageHero';
import { WorkflowPipeline } from '@/components/dashboard/WorkflowPipeline';
import { CaseListSkeleton } from '@/components/ui/Skeleton';
import { NoSearchResults } from '@/components/ui/EmptyState';
import { useCasesQuery } from '@/hooks/useCaseQueries';
import type { CaseStatus, ChangeType } from '@/types';

export function PlannerCasesPage() {
  const [status, setStatus] = useState<CaseStatus | 'ALL'>('ALL');
  const [changeType, setChangeType] = useState<ChangeType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useCasesQuery({
    limit: 100,
    status: status === 'ALL' ? undefined : status,
    change_type: changeType === 'ALL' ? undefined : changeType,
    search: search || undefined,
  });

  const cases = data?.data ?? [];
  const allCasesQuery = useCasesQuery({ limit: 100 });
  const clear = () => {
    setStatus('ALL');
    setChangeType('ALL');
    setSearch('');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHero
        eyebrow="Case registry"
        title="Development cases"
        description="Every Kili-Shadows detection promoted to a trackable case — filter by workflow stage, change type, or parcel reference."
      />

      {!isLoading && status === 'ALL' && !search && (
        <WorkflowPipeline cases={allCasesQuery.data?.data ?? cases} linkPrefix="/planner/cases" />
      )}

      <CaseFiltersBar
        filters={{ status, changeType, search }}
        onChange={(f) => {
          if (f.status !== undefined) setStatus(f.status);
          if (f.changeType !== undefined) setChangeType(f.changeType);
          if (f.search !== undefined) setSearch(f.search);
        }}
      />

      {isLoading ? (
        <CaseListSkeleton count={6} />
      ) : cases.length === 0 ? (
        <NoSearchResults onClear={clear} />
      ) : (
        <>
          <p className="text-sm text-charcoal-muted">
            {cases.length} case{cases.length === 1 ? '' : 's'}
          </p>
          <CasesTable cases={cases} caseLinkPrefix="/planner/cases" />
          <div className="space-y-3 md:hidden">
            {cases.map((c) => (
              <CaseListItem key={c.id} caseItem={c} caseLinkPrefix="/planner/cases" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
