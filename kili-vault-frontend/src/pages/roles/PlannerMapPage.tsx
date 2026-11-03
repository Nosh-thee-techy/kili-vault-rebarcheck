import { lazy, Suspense, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DetectionTriageList } from "@/components/dashboard/DetectionTriageList";
import { PlannerFeaturePanel } from "@/components/map/PlannerFeaturePanel";
import type { PlannerMapSelection } from "@/components/map/KilimaniMap";
import { MapSkeleton } from "@/components/ui/Skeleton";
import { PLANNER_MAP_LAYERS } from "@/config/mapLayers";
import { useCasesQuery } from "@/hooks/useCaseQueries";
import { useDetectionsGeoJSONQuery } from "@/hooks/useDetectionQueries";

const KilimaniMap = lazy(() =>
  import("@/components/map/KilimaniMap").then((m) => ({
    default: m.KilimaniMap,
  })),
);

export function PlannerMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCaseId = searchParams.get("case");
  const selectedDetectionId = searchParams.get("detection");
  const { data, isLoading } = useCasesQuery({ limit: 100 });
  const { data: detectionsGeoJSON } = useDetectionsGeoJSONQuery();
  const cases = data?.data ?? [];

  const [layerVisibility] = useState(() =>
    Object.fromEntries(
      PLANNER_MAP_LAYERS.map((layer) => [layer.id, layer.defaultVisible]),
    ),
  );
  const showCases = true;
  const showDetections = true;
  const [featureSelection, setFeatureSelection] =
    useState<PlannerMapSelection | null>(null);
  const [clearSelectionToken, setClearSelectionToken] = useState(0);

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(20rem,35vh)] overflow-hidden lg:grid-cols-[minmax(0,3fr)_minmax(20rem,1fr)] lg:grid-rows-1">
      <section className="relative min-h-0 min-w-0" aria-label="Kilimani map">
        <Suspense fallback={<MapSkeleton />}>
          {!isLoading ? (
            <KilimaniMap
              cases={cases}
              detectionsGeoJSON={detectionsGeoJSON}
              selectedCaseId={selectedCaseId}
              selectedDetectionId={selectedDetectionId}
              layerVisibility={layerVisibility}
              mapLayers={PLANNER_MAP_LAYERS}
              enablePlannerTools
              showAttributionFooter
              showCases={showCases}
              showDetections={showDetections}
              colorByStatus
              onCaseSelect={(id) => setSearchParams({ case: id })}
              onFeatureSelect={setFeatureSelection}
              clearSelectionToken={clearSelectionToken}
              className="h-full min-h-0"
            />
          ) : (
            <MapSkeleton />
          )}
        </Suspense>
        <PlannerFeaturePanel
          selection={featureSelection}
          cases={cases}
          onClose={() => {
            setFeatureSelection(null);
            setClearSelectionToken((value) => value + 1);
          }}
        />
      </section>
      <calcite-panel heading="AI triage" className="min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <DetectionTriageList
            onSelectDetection={(detectionId) => {
              setFeatureSelection(null);
              setSearchParams({ detection: detectionId });
            }}
          />
        </div>
      </calcite-panel>
    </div>
  );
}
