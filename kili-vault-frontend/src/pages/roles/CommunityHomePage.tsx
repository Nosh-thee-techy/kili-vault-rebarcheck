import { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyReportCard } from '@/components/community/MyReportCard';
import { MapSkeleton } from '@/components/ui/Skeleton';
import { MAP_LAYERS } from '@/config/mapLayers';
import { useCasesQuery } from '@/hooks/useCaseQueries';
import { useMyObservationsQuery } from '@/hooks/useObservationQueries';

const KilimaniMap = lazy(() =>
  import('@/components/map/KilimaniMap').then((module) => ({
    default: module.KilimaniMap,
  })),
);

const COMMUNITY_MAP_LAYERS = MAP_LAYERS.filter((layer) =>
  ['kilimani-ward', 'buildings', 'roads'].includes(layer.id),
);

const COMMUNITY_LAYER_VISIBILITY = Object.fromEntries(
  COMMUNITY_MAP_LAYERS.map((layer) => [layer.id, layer.defaultVisible]),
);

export function CommunityHomePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useMyObservationsQuery();
  const casesQuery = useCasesQuery({ limit: 100 });
  const reports = data?.observations ?? [];
  const totalReports = isLoading ? '…' : isError ? '—' : data?.total ?? 0;
  const pendingReports =
    isLoading ? '…' : isError ? '—' : data?.pendingCount ?? 0;
  const linkedReports =
    isLoading ? '…' : isError ? '—' : data?.linkedCount ?? 0;
  const cases = useMemo(
    () => (casesQuery.data?.data ?? []).filter((item) => item.status !== 'CLOSED'),
    [casesQuery.data],
  );

  return (
    <main className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(16rem,42vh)_minmax(16rem,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1.5fr)_minmax(23rem,0.85fr)] lg:grid-rows-1">
      <section
        className="relative min-h-0 min-w-0 border-b border-[var(--calcite-color-border-3)] lg:border-b-0 lg:border-r"
        aria-label="Kilimani ward activity map"
      >
        {casesQuery.isLoading ? (
          <MapSkeleton />
        ) : (
          <Suspense fallback={<MapSkeleton />}>
            <KilimaniMap
              cases={cases}
              layerVisibility={COMMUNITY_LAYER_VISIBILITY}
              mapLayers={COMMUNITY_MAP_LAYERS}
              showCases
              colorByStatus
              caseLinkPrefix="/community/cases"
              showAttributionFooter
              className="h-full min-h-0"
            />
          </Suspense>
        )}
        <div className="pointer-events-none absolute left-3 top-3 z-20">
          <calcite-chip icon="map" scale="s">
            Kilimani · active cases
          </calcite-chip>
        </div>
        {casesQuery.isError && (
          <div className="pointer-events-none absolute bottom-12 left-3 z-20 max-w-sm">
            <calcite-notice open kind="warning" scale="s">
              Ward case data is currently unavailable.
            </calcite-notice>
          </div>
        )}
      </section>

      <calcite-panel
        heading="Community workspace"
        description="View ward activity and track reports you have submitted."
        className="min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-[var(--calcite-color-border-3)] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-[var(--calcite-color-border-3)]">
                <div className="px-2 first:pl-0">
                  <p className="text-lg font-semibold tabular-nums text-[var(--calcite-color-text-1)]">
                    {totalReports}
                  </p>
                  <p className="text-xs text-[var(--calcite-color-text-3)]">
                    Reports
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-lg font-semibold tabular-nums text-[var(--calcite-color-text-1)]">
                    {pendingReports}
                  </p>
                  <p className="text-xs text-[var(--calcite-color-text-3)]">
                    Waiting
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-lg font-semibold tabular-nums text-[var(--calcite-color-text-1)]">
                    {linkedReports}
                  </p>
                  <p className="text-xs text-[var(--calcite-color-text-3)]">
                    Linked
                  </p>
                </div>
              </div>
            </div>
            <calcite-button
              appearance="solid"
              icon-start="plus"
              scale="m"
              className="w-full"
              onClick={() => navigate('/community/report')}
            >
              Report a site observation
            </calcite-button>
          </div>

          <section className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-3 sm:px-4">
              <h2 className="text-sm font-semibold text-[var(--calcite-color-text-1)]">
                My reports
              </h2>
              <calcite-chip scale="s">
                {isLoading ? 'Loading' : isError ? 'Unavailable' : reports.length}
              </calcite-chip>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isError ? (
                <div className="p-3 sm:p-4">
                  <calcite-notice open kind="danger" scale="s">
                    <span slot="title">Reports unavailable</span>
                    {error instanceof Error
                      ? error.message
                      : 'Your reports could not be loaded.'}
                  </calcite-notice>
                </div>
              ) : isLoading ? (
                <div className="flex min-h-28 items-center justify-center">
                  <calcite-loader label="Loading your reports" scale="m" />
                </div>
              ) : reports.length === 0 ? (
                <div className="p-3 sm:p-4">
                  <calcite-notice open kind="info" scale="s">
                    <span slot="title">No reports submitted</span>
                    Your submissions and review updates will appear here.
                  </calcite-notice>
                </div>
              ) : (
                <calcite-list>
                  {reports.map((report) => (
                    <MyReportCard key={report.id} report={report} />
                  ))}
                </calcite-list>
              )}
            </div>
          </section>
        </div>
      </calcite-panel>
    </main>
  );
}
