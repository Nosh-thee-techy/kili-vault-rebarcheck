import { useParams } from 'react-router-dom';
import { CaseDetailView } from '@/components/cases/CaseDetailView';
import { useCaseQuery } from '@/hooks/useCaseQueries';

export function SharedCaseDetailPage({ backTo }: { backTo: string }) {
  const { id } = useParams<{ id: string }>();
  const { data: caseItem, isLoading, isError } = useCaseQuery(id);

  if (isLoading) {
    return (
      <main className="h-full min-h-0 w-full">
        <calcite-panel heading="Development case" className="h-full">
          <div className="flex h-full min-h-48 items-center justify-center">
            <calcite-loader label="Loading development case" scale="m" />
          </div>
        </calcite-panel>
      </main>
    );
  }

  if (isError || !caseItem) {
    return (
      <main className="h-full min-h-0 w-full">
        <calcite-panel heading="Case unavailable" className="h-full">
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
    <main className="h-full min-h-0 w-full">
      <CaseDetailView caseItem={caseItem} backTo={backTo} />
    </main>
  );
}
