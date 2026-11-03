import { lazy, Suspense } from 'react';
import { AgencyVerificationCard } from '@/components/dashboard/AgencyVerificationCard';
import { MapSkeleton } from '@/components/ui/Skeleton';
import { MAP_LAYERS } from '@/config/mapLayers';
import { useCasesQuery } from '@/hooks/useCaseQueries';

const KilimaniMap = lazy(() =>
  import('@/components/map/KilimaniMap').then((module) => ({
    default: module.KilimaniMap,
  })),
);

const AGENCY_MAP_LAYERS = MAP_LAYERS.filter((layer) =>
  ['kilimani-ward', 'buildings', 'roads'].includes(layer.id),
);

const AGENCY_LAYER_VISIBILITY = Object.fromEntries(
  AGENCY_MAP_LAYERS.map((layer) => [layer.id, layer.defaultVisible]),
);

export function AgencyQueuePage() {
  const { data, isLoading, isError, error } = useCasesQuery({ limit: 50 });
  const queue = (data?.data ?? []).filter(
    (item) =>
      item.status === 'AGENCY_PENDING' || item.status === 'EVIDENCE_SUBMITTED',
  );
  const totalEvidence = queue.reduce(
    (sum, item) => sum + (item.evidenceItems?.length ?? 0),
    0,
  );

  return (
    <main className="flex min-w-0 flex-col gap-4">
      <header className="flex min-w-0 flex-col gap-3 border-b border-[var(--calcite-color-border-3)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--calcite-color-text-3)]">
            Agency workspace
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--calcite-color-text-1)] sm:text-2xl">
            Verification desk
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--calcite-color-text-2)]">
            Review submitted evidence against its location and case record.
            Decisions are recorded in the verification workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <calcite-chip icon="clock" scale="s">
            {isLoading
              ? 'Loading queue'
              : isError
                ? 'Queue unavailable'
                : queue.length + ' awaiting review'}
          </calcite-chip>
          <calcite-chip icon="attachment" scale="s">
            {isLoading || isError
              ? 'Evidence count unavailable'
              : totalEvidence + ' evidence items'}
          </calcite-chip>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(23rem,0.9fr)]">
        <section
          className="relative h-[min(55vh,620px)] min-h-[340px] min-w-0 overflow-hidden border border-[var(--calcite-color-border-3)] xl:h-[min(72vh,780px)] xl:min-h-[560px]"
          aria-label="Kilimani verification map"
        >
          {isLoading ? (
            <MapSkeleton />
          ) : (
            <Suspense fallback={<MapSkeleton />}>
              <KilimaniMap
                cases={queue}
                layerVisibility={AGENCY_LAYER_VISIBILITY}
                mapLayers={AGENCY_MAP_LAYERS}
                showCases
                colorByStatus
                caseLinkPrefix="/agency/cases"
                showAttributionFooter
                className="h-full min-h-0"
              />
            </Suspense>
          )}
          <div className="pointer-events-none absolute left-3 top-3 z-20">
            <calcite-chip icon="map" scale="s">
              Kilimani · cases awaiting verification
            </calcite-chip>
          </div>
        </section>

        <calcite-panel
          heading="Verification queue"
          description="Open a case to inspect its evidence pack and record a decision."
          className="min-h-[24rem] xl:h-[min(72vh,780px)] xl:min-h-[560px]"
        >
          <div className="h-full min-h-0 overflow-y-auto">
            {isError ? (
              <div className="p-4">
                <calcite-notice open kind="danger" scale="s">
                  <span slot="title">Queue unavailable</span>
                  {error instanceof Error
                    ? error.message
                    : 'Verification cases could not be loaded.'}
                </calcite-notice>
              </div>
            ) : isLoading ? (
              <div className="flex min-h-32 items-center justify-center">
                <calcite-loader label="Loading verification queue" scale="m" />
              </div>
            ) : queue.length === 0 ? (
              <div className="p-4">
                <calcite-notice open kind="info" scale="s">
                  <span slot="title">No cases awaiting verification</span>
                  Cases routed for agency review will appear here with their
                  mapped locations and submitted evidence.
                </calcite-notice>
              </div>
            ) : (
              <calcite-list>
                {queue.map((caseItem) => (
                  <AgencyVerificationCard
                    key={caseItem.id}
                    caseItem={caseItem}
                  />
                ))}
              </calcite-list>
            )}
          </div>
        </calcite-panel>
      </div>
    </main>
  );
}
