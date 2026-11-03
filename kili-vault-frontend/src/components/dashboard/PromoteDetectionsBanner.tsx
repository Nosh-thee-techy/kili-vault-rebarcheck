import { Radar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  usePromoteDetections,
  useUnpromotedDetectionsQuery,
} from '@/hooks/useDetectionQueries';

export function PromoteDetectionsBanner() {
  const { data: unpromoted } = useUnpromotedDetectionsQuery(0.75);
  const promote = usePromoteDetections();

  const count = unpromoted?.unpromoted ?? 0;
  if (count === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-forest/20 bg-forest/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest/10 text-forest">
          <Radar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">
            {count.toLocaleString()} high-confidence detection{count === 1 ? '' : 's'} ready to promote
          </p>
          <p className="mt-0.5 text-xs text-charcoal-muted">
            Creates AI_FLAGGED development cases linked to live Kili-Shadows detections (≥75% confidence).
          </p>
        </div>
      </div>
      <Button
        variant="primary"
        size="md"
        className="shrink-0"
        isLoading={promote.isPending}
        onClick={() => promote.mutate({ min_confidence: 0.75, limit: 25 })}
      >
        Promote to cases
      </Button>
    </div>
  );
}
