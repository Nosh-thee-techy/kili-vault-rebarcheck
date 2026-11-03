import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquarePlus, Users } from 'lucide-react';
import { PageHero } from '@/components/dashboard/PageHero';
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
    <div className="space-y-6 animate-fade-up">
      <PageHero
        eyebrow="Kilimani voices"
        title="What's changing in your ward"
        description="Public view of reported physical developments. Submit observations — planners review before they become evidence."
        action={
          <Link to="/community/observe">
            <Button variant="secondary" size="md" className="gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Report observation
            </Button>
          </Link>
        }
      />

      <div className="flex items-center gap-3 rounded-2xl border border-sage/30 bg-mist/30 px-4 py-3 text-sm text-charcoal-muted">
        <Users className="h-5 w-5 shrink-0 text-forest" />
        Community reports are <strong className="font-semibold text-charcoal">observed</strong>, not
        verified — they enter a structured planner review workflow.
      </div>

      <div className="h-[min(60vh,560px)] overflow-hidden rounded-2xl border border-sand shadow-soft">
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
    </div>
  );
}
