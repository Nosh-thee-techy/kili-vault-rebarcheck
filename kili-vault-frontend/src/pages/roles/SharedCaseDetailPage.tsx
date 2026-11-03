import { Link, useParams } from 'react-router-dom';
import { CaseDetailView } from '@/components/cases/CaseDetailView';
import { useCaseQuery } from '@/hooks/useCaseQueries';

export function SharedCaseDetailPage({ backTo }: { backTo: string }) {
  const { id } = useParams<{ id: string }>();
  const { data: caseItem, isLoading, isError } = useCaseQuery(id);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-5 sm:px-6">
        <calcite-panel heading="Development case">
          <div className="flex min-h-48 items-center justify-center">
            <calcite-loader label="Loading development case" scale="m" />
          </div>
        </calcite-panel>
      </main>
    );
  }

  if (isError || !caseItem) {
    return (
      <main className="mx-auto w-full max-w-screen-2xl space-y-4 px-4 py-5 sm:px-6">
        <Link to={backTo} className="inline-flex items-center gap-2 text-sm font-medium text-charcoal hover:underline">
          <calcite-icon icon="arrow-left" scale="s" />
          Back to cases
        </Link>
        <calcite-panel heading="Case unavailable">
          <div className="space-y-4 p-4">
            <calcite-notice open kind="danger">
              This case may not exist or you may not have permission to view it.
            </calcite-notice>
            <calcite-button
              appearance="outline"
              scale="s"
              onClick={() => {
                window.location.href = backTo;
              }}
            >
              Back to cases
            </calcite-button>
          </div>
        </calcite-panel>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-screen-2xl space-y-4 px-4 py-5 sm:px-6">
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm font-medium text-charcoal hover:underline">
        <calcite-icon icon="arrow-left" scale="s" />
        Back to cases
      </Link>
      <CaseDetailView
        caseItem={caseItem}
        mapLinkPrefix={
          backTo.startsWith('/planner') ? '/planner/map' : backTo.startsWith('/community') ? '/community' : undefined
        }
      />
    </main>
  );
}
