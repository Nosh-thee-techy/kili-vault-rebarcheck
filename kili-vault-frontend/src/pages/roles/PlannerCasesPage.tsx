import { useState } from 'react';
import { CaseFiltersBar } from '@/components/cases/CaseFiltersBar';
import { CaseListItem } from '@/components/cases/CaseListItem';
import { CasesTable } from '@/components/cases/CasesTable';
import { WorkflowPipeline } from '@/components/dashboard/WorkflowPipeline';
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
    <main className="mx-auto w-full max-w-screen-2xl space-y-5 px-4 py-5 sm:px-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-muted">
          Case registry
        </p>
        <h1 className="font-body text-2xl font-semibold text-charcoal">Development cases</h1>
        <p className="max-w-3xl text-sm text-charcoal-muted">
          Review cases raised from Kili-Shadows detections, follow their workflow stage, and open a case to inspect its evidence.
        </p>
      </header>

      {!isLoading && status === 'ALL' && !search && (
        <WorkflowPipeline cases={allCasesQuery.data?.data ?? cases} linkPrefix="/planner/cases" />
      )}

      <calcite-panel heading="Case registry" description="Search and filter development cases.">
        <div className="space-y-4 p-4">
          <CaseFiltersBar
            filters={{ status, changeType, search }}
            onChange={(filters) => {
              if (filters.status !== undefined) setStatus(filters.status);
              if (filters.changeType !== undefined) setChangeType(filters.changeType);
              if (filters.search !== undefined) setSearch(filters.search);
            }}
          />

          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center" aria-live="polite">
              <calcite-loader label="Loading development cases" scale="m" />
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-start gap-3 border-t border-sand pt-4">
              <calcite-notice open kind="info" scale="s">
                No cases match these filters. Adjust the search or clear the selected filters.
              </calcite-notice>
              <calcite-button appearance="outline" scale="s" onClick={clear}>
                Clear filters
              </calcite-button>
            </div>
          ) : (
            <section aria-label="Case results" className="space-y-3 border-t border-sand pt-4">
              <p className="text-sm text-charcoal-muted" aria-live="polite">
                Showing <span className="font-semibold text-charcoal">{cases.length}</span>{' '}
                case{cases.length === 1 ? '' : 's'}
              </p>
              <CasesTable cases={cases} caseLinkPrefix="/planner/cases" />
              <div className="overflow-hidden rounded border border-sand md:hidden">
                {cases.map((caseItem) => (
                  <CaseListItem
                    key={caseItem.id}
                    caseItem={caseItem}
                    caseLinkPrefix="/planner/cases"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </calcite-panel>
    </main>
  );
}
