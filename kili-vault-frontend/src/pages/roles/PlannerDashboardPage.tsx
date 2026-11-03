import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlannerFeaturePanel } from "@/components/map/PlannerFeaturePanel";
import type { PlannerMapSelection } from "@/components/map/KilimaniMap";
import { MapSkeleton } from "@/components/ui/Skeleton";
import { MAP_LAYERS } from "@/config/mapLayers";
import { useCasesQuery } from "@/hooks/useCaseQueries";
import { useDetectionsGeoJSONQuery } from "@/hooks/useDetectionQueries";

const KilimaniMap = lazy(() =>
  import("@/components/map/KilimaniMap").then((m) => ({
    default: m.KilimaniMap,
  })),
);

export function PlannerDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useCasesQuery({ limit: 50 });
  const { data: detectionsGeoJSON } = useDetectionsGeoJSONQuery();
  const cases = data?.data ?? [];
  const reviewQueue = cases.filter(
    (c) => c.status === "AI_FLAGGED" || c.status === "UNDER_REVIEW",
  );
  const countStatus = (status: string) =>
    cases.filter((item) => item.status === status).length;

  const [layerVisibility] = useState(() =>
    Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l.defaultVisible])),
  );
  const showCases = true;
  const showDetections = true;
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [featureSelection, setFeatureSelection] =
    useState<PlannerMapSelection | null>(null);
  const [clearSelectionToken, setClearSelectionToken] = useState(0);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <section
        className="relative h-full min-h-0 w-full"
        aria-label="Kilimani map workspace"
      >
        <Suspense fallback={<MapSkeleton />}>
          {!isLoading ? (
            <KilimaniMap
              cases={cases}
              detectionsGeoJSON={detectionsGeoJSON}
              layerVisibility={layerVisibility}
              showCases={showCases}
              showDetections={showDetections}
              colorByStatus
              showAttributionFooter
              onCaseSelect={(id) => navigate(`/planner/cases/${id}`)}
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

        <div className="pointer-events-auto absolute bottom-8 left-1/2 z-30 -translate-x-1/2">
          <calcite-button
            appearance="solid"
            scale="m"
            onClick={() => setReviewQueueOpen((value) => !value)}
            aria-expanded={reviewQueueOpen}
          >
            <calcite-icon icon="list" slot="icon-start" />
            Review queue
          </calcite-button>
        </div>

        <div className="pointer-events-auto absolute bottom-8 left-4 z-30">
          {!metricsOpen && (
            <calcite-button
              appearance="outline"
              scale="s"
              icon-start="dashboard"
              label="Open workflow metrics"
              onClick={() => setMetricsOpen(true)}
            />
          )}
          {metricsOpen && (
            <calcite-panel
              heading="Workflow metrics"
              className="w-[min(24rem,calc(100vw-2rem))]"
            >
              <calcite-button
                slot="header-actions-end"
                appearance="transparent"
                icon-start="x"
                label="Close workflow metrics"
                onClick={() => setMetricsOpen(false)}
              />
              <calcite-list label="Workflow metrics">
                {[
                  ["AI flagged", countStatus("AI_FLAGGED"), "AI_FLAGGED"],
                  ["Under review", countStatus("UNDER_REVIEW"), "UNDER_REVIEW"],
                  [
                    "Mitigation required",
                    countStatus("MITIGATION_REQUIRED"),
                    "MITIGATION_REQUIRED",
                  ],
                  [
                    "Evidence submitted",
                    countStatus("EVIDENCE_SUBMITTED"),
                    "EVIDENCE_SUBMITTED",
                  ],
                  [
                    "Agency pending",
                    countStatus("AGENCY_PENDING"),
                    "AGENCY_PENDING",
                  ],
                  ["Verified", countStatus("VERIFIED"), "VERIFIED"],
                  ["Closed", countStatus("CLOSED"), "CLOSED"],
                ].map(([label, value, status]) => (
                  <calcite-list-item
                    key={status}
                    label={String(label)}
                    description={String(value)}
                    onClick={() => navigate(`/planner/cases?status=${status}`)}
                  />
                ))}
              </calcite-list>
            </calcite-panel>
          )}
        </div>

        {reviewQueueOpen && (
          <calcite-panel
            heading={`Review queue (${reviewQueue.length})`}
            className="pointer-events-auto absolute bottom-16 left-1/2 z-20 h-[min(24rem,calc(100%-6rem))] w-[min(52rem,calc(100%-2rem))] -translate-x-1/2"
          >
            <calcite-button
              slot="header-actions-end"
              appearance="transparent"
              icon-start="x"
              label="Close review queue"
              onClick={() => setReviewQueueOpen(false)}
            />
            {reviewQueue.length > 0 ? (
              <calcite-list label="Cases awaiting review">
                {reviewQueue.map((item) => (
                  <calcite-list-item
                    key={item.id}
                    label={item.caseNumber}
                    description={`${item.title} · ${item.status.replace(/_/g, " ")}`}
                    onClick={() => navigate(`/planner/cases/${item.id}`)}
                  />
                ))}
              </calcite-list>
            ) : (
              <calcite-notice open kind="info" scale="s">
                No AI-flagged or under-review cases are awaiting triage.
              </calcite-notice>
            )}
          </calcite-panel>
        )}
      </section>
    </div>
  );
}
