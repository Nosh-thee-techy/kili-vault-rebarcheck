import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CaseDetailView } from '@/components/cases/CaseDetailView';
import { Button } from '@/components/ui/Button';
import { DetailSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCaseQuery } from '@/hooks/useCaseQueries';

export function SharedCaseDetailPage({ backTo }: { backTo: string }) {
  const { id } = useParams<{ id: string }>();
  const { data: caseItem, isLoading, isError } = useCaseQuery(id);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !caseItem) {
    return (
      <EmptyState
        title="Case not found"
        description="This case may not exist or you may not have permission to view it."
        actionLabel="Back"
        onAction={() => {
          window.location.href = backTo;
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link to={backTo}>
        <Button variant="ghost" size="sm" className="gap-2 px-0 hover:bg-transparent">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>
      <CaseDetailView
        caseItem={caseItem}
        mapLinkPrefix={
          backTo.startsWith('/planner') ? '/planner/map' : backTo.startsWith('/community') ? '/community' : undefined
        }
      />
    </div>
  );
}
