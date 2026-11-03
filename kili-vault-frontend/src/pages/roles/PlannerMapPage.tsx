import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { CaseListItem } from '@/components/cases/CaseListItem';
import { MapLayerPanel } from '@/components/map/MapLayerPanel';
import { Button } from '@/components/ui/Button';
import { MapSkeleton } from '@/components/ui/Skeleton';
import { MAP_LAYERS } from '@/config/mapLayers';
import { useCasesQuery } from '@/hooks/useCaseQueries';
import { useDetectionStatsQuery, useDetectionsGeoJSONQuery } from '@/hooks/useDetectionQueries';
import { useIsMobile } from '@/hooks/useMediaQuery';

const KilimaniMap = lazy(() =>
  import('@/components/map/KilimaniMap').then((m) => ({ default: m.KilimaniMap })),
);

export function PlannerMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCaseId = searchParams.get('case');
  const isMobile = useIsMobile();
  const { data, isLoading } = useCasesQuery({ limit: 100 });
  const { data: detectionsGeoJSON } = useDetectionsGeoJSONQuery();
  const { data: detectionStats } = useDetectionStatsQuery();
  const cases = data?.data ?? [];

  const [layerVisibility, setLayerVisibility] = useState(() =>
    Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l.defaultVisible])),
  );
  const [showCases, setShowCases] = useState(true);
  const [showDetections, setShowDetections] = useState(true);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId),
    [cases, selectedCaseId],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-sage">Interactive GIS</p>
        <h1 className="font-display text-3xl font-bold text-charcoal">Kilimani map</h1>
      </div>

      <div className="relative h-[min(72vh,720px)] min-h-[360px]">
        <Suspense fallback={<MapSkeleton />}>
          {!isLoading ? (
            <KilimaniMap
              cases={cases}
              detectionsGeoJSON={detectionsGeoJSON}
              selectedCaseId={selectedCaseId}
              layerVisibility={layerVisibility}
              showCases={showCases}
              showDetections={showDetections}
              colorByStatus
              onCaseSelect={(id) => setSearchParams({ case: id })}
              className="h-full"
            />
          ) : (
            <MapSkeleton />
          )}
        </Suspense>
        {!isMobile && (
          <MapLayerPanel
            visibility={layerVisibility}
            onToggle={(id, v) => setLayerVisibility((p) => ({ ...p, [id]: v }))}
            showCases={showCases}
            onToggleCases={setShowCases}
            showDetections={showDetections}
            onToggleDetections={setShowDetections}
            detectionCount={detectionStats?.total_detections}
            className="absolute right-4 top-4 z-20 w-72"
          />
        )}
      </div>

      {isMobile && (
        <MapLayerPanel
          visibility={layerVisibility}
          onToggle={(id, v) => setLayerVisibility((p) => ({ ...p, [id]: v }))}
          showCases={showCases}
          onToggleCases={setShowCases}
          showDetections={showDetections}
          onToggleDetections={setShowDetections}
          detectionCount={detectionStats?.total_detections}
        />
      )}

      {selectedCase && (
        <section>
          <div className="mb-3 flex justify-between">
            <h2 className="font-display text-xl font-semibold">Selected case</h2>
            <Link to={`/planner/cases/${selectedCase.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                Details <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <CaseListItem caseItem={selectedCase} caseLinkPrefix="/planner/cases" />
        </section>
      )}
    </div>
  );
}
