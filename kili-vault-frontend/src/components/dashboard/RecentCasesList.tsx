import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CaseListItem } from '@/components/cases/CaseListItem';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { CaseListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DevelopmentCase } from '@/types';

export function RecentCasesList({
  cases,
  isLoading,
}: {
  cases: DevelopmentCase[];
  isLoading: boolean;
}) {
  const recent = cases.slice(0, 5);

  return (
    <Card padding="md" hover>
      <CardHeader
        title="Recent development cases"
        description="Latest Kili-Shadows detections promoted to cases."
        action={
          <Link to="/cases">
            <Button variant="ghost" size="sm" className="gap-1">
              View all
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <CaseListSkeleton count={3} />
      ) : recent.length === 0 ? (
        <EmptyState
          title="No cases yet"
          description="When the detection engine flags physical changes in Kilimani, they will appear here as development cases."
          actionLabel="Open map"
          onAction={() => {
            window.location.href = '/map';
          }}
        />
      ) : (
        <div className="space-y-3">
          {recent.map((caseItem) => (
            <CaseListItem key={caseItem.id} caseItem={caseItem} compact />
          ))}
        </div>
      )}
    </Card>
  );
}
