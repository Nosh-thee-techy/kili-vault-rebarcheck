import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Maximize2, Radar } from "lucide-react";
import { CaseListItem } from "@/components/cases/CaseListItem";
import { CommandKpiStrip } from "@/components/dashboard/CommandKpiStrip";
import { CommunityObservationsCard } from "@/components/dashboard/CommunityObservationsCard";
import { PromoteDetectionsBanner } from "@/components/dashboard/PromoteDetectionsBanner";
import { PageHero } from "@/components/dashboard/PageHero";
import { SpotlightCaseCard } from "@/components/dashboard/SpotlightCaseCard";
import { WorkflowPipeline } from "@/components/dashboard/WorkflowPipeline";
import { Button } from "@/components/ui/Button";
import { MapSkeleton, CaseListSkeleton } from "@/components/ui/Skeleton";
import { MAP_LAYERS } from "@/config/mapLayers";
import { usePresenter } from "@/context/PresenterContext";
import { useCasesQuery, useNormalizedCaseStats } from "@/hooks/useCaseQueries";
import {
  useDetectionStatsQuery,
  useDetectionsGeoJSONQuery,
} from "@/hooks/useDetectionQueries";
import { pickDemoSpotlightCase } from "@/lib/demoSpotlightCase";

const KilimaniMap = lazy(() =>
  import("@/components/map/KilimaniMap").then((m) => ({
    default: m.KilimaniMap,
  })),
);

export function PlannerDashboardPage() {
  const { isActive, spotlightCaseId } = usePresenter();
  const { data, isLoading } = useCasesQuery({ limit: 50 });
  const { stats, isLoading: statsLoading } = useNormalizedCaseStats();
  const { data: detectionStats } = useDetectionStatsQuery();
  const { data: detectionsGeoJSON } = useDetectionsGeoJSONQuery();
  const cases = data?.data ?? [];
  const reviewQueue = cases.filter(
    (c) => c.status === "AI_FLAGGED" || c.status === "UNDER_REVIEW",
  );
  const spotlight = useMemo(() => {
    if (isActive && spotlightCaseId) {
      const matched = cases.find((c) => c.id === spotlightCaseId);
      if (matched) return matched;
    }
    return pickDemoSpotlightCase(cases);
  }, [cases, isActive, spotlightCaseId]);

  const [layerVisibility] = useState(() =>
    Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l.defaultVisible])),
  );

  const kpiStats = stats ?? {
    total: 0,
    aiFlagged: 0,
    underReview: 0,
    mitigationRequired: 0,
    pendingVerification: 0,
    highRisk: 0,
    closed: 0,
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHero
        eyebrow="Operations command center"
        title="Kilimani oversight"
        description="Map-first spatial intelligence for ward-scale development accountability. Kili-Shadows flags change; you assess, require mitigation, and close with evidence."
        live
        liveLabel="Kili-Shadows active"
        action={
          <Link to="/planner/map">
            <Button variant="primary" size="md" className="gap-2">
              <Maximize2 className="h-4 w-4" />
              Full map
            </Button>
          </Link>
        }
      />

      <PromoteDetectionsBanner />
      <CommunityObservationsCard />

      {!statsLoading && (
        <section aria-label="Workflow pipeline">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sage">
            Cases by workflow stage
          </p>
          <WorkflowPipeline cases={cases} linkPrefix="/planner/cases" />
        </section>
      )}

      {/* Map command center — breaks out to feel full-bleed */}
      <section className="relative -mx-4 md:-mx-6 lg:-mx-8">
        <div className="relative h-[min(58vh,560px)] min-h-[300px] overflow-hidden border-y border-sand bg-charcoal/5">
          <Suspense fallback={<MapSkeleton />}>
            {!isLoading ? (
              <KilimaniMap
                cases={cases}
                detectionsGeoJSON={detectionsGeoJSON}
                layerVisibility={layerVisibility}
                showCases
                showDetections
                colorByStatus
                className="h-full rounded-none border-0"
              />
            ) : (
              <MapSkeleton />
            )}
          </Suspense>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-off-white/80 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 z-10 md:left-6 md:right-6">
            {!statsLoading && (
              <CommandKpiStrip
                stats={kpiStats}
                className="pointer-events-auto"
              />
            )}
          </div>

          <div className="absolute left-4 top-4 z-10 hidden md:block">
            <span className="inline-flex items-center gap-2 rounded-full border border-off-white/50 bg-off-white/90 px-3 py-1.5 text-xs font-semibold text-forest shadow-soft backdrop-blur-md">
              <Radar className="h-3.5 w-3.5" />
              Sentinel-2 · Kilimani Ward
              {detectionStats?.total_detections != null && (
                <span className="font-mono text-sage">
                  · {detectionStats.total_detections.toLocaleString()}{" "}
                  detections
                </span>
              )}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2">
          {spotlight && !isLoading ? (
            <SpotlightCaseCard
              caseItem={spotlight}
              linkPrefix="/planner/cases"
            />
          ) : (
            <CaseListSkeleton count={1} />
          )}
        </section>

        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-charcoal">
              Review queue
            </h2>
            <Link to="/planner/cases?status=AI_FLAGGED">
              <Button variant="outline" size="sm">
                View all flagged
              </Button>
            </Link>
          </div>
          {isLoading ? (
            <CaseListSkeleton count={3} />
          ) : reviewQueue.length > 0 ? (
            <div className="space-y-3">
              {reviewQueue.slice(0, 4).map((c) => (
                <CaseListItem
                  key={c.id}
                  caseItem={c}
                  compact
                  caseLinkPrefix="/planner/cases"
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-sage/50 bg-mist/20 p-8 text-center text-sm text-charcoal-muted">
              Queue clear — no AI-flagged cases awaiting triage.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
