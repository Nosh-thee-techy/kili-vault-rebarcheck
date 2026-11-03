import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MapSkeleton } from '@/components/ui/Skeleton';
import { MAP_LAYERS } from '@/config/mapLayers';
import { useCasesQuery } from '@/hooks/useCaseQueries';

const KilimaniMap = lazy(() =>
  import('@/components/map/KilimaniMap').then((m) => ({ default: m.KilimaniMap })),
);

export function CommunityMapPage() {
  const { data, isLoading } = useCasesQuery({ limit: 100 });
  const cases = (data?.data ?? []).filter((c) => c.status !== 'CLOSED');
  const [layerVisibility] = useState(() =>
    Object.fromEntries(
      MAP_LAYERS.map((l) => [l.id, ['kilimani-ward', 'buildings', 'roads'].includes(l.id)]),
    ),
  );

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <Link to="/community" className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal-muted">
        <ArrowLeft className="h-4 w-4" />
        My reports
      </Link>

      <div>
        <h1 className="font-display text-xl font-bold text-charcoal">Ward map</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Active development cases in Kilimani — not every report appears here until reviewed.
        </p>
      </div>

      <div className="h-[min(55vh,480px)] overflow-hidden rounded-2xl border border-sand shadow-soft">
        <Suspense fallback={<MapSkeleton />}>
          {!isLoading ? (
            <KilimaniMap
              cases={cases}
              layerVisibility={layerVisibility}
              showCases
              colorByStatus
              className="h-full rounded-none border-0"
            />
          ) : (
            <MapSkeleton />
          )}
        </Suspense>
      </div>

      <Link to="/community/report">
        <Button variant="secondary" size="md" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          New report
        </Button>
      </Link>
    </div>
  );
}
