import { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapSkeleton } from '@/components/ui/Skeleton';
import { MAP_LAYERS } from '@/config/mapLayers';
import { useCasesQuery } from '@/hooks/useCaseQueries';

const KilimaniMap = lazy(() =>
  import('@/components/map/KilimaniMap').then((m) => ({ default: m.KilimaniMap })),
);

export function CommunityMapPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useCasesQuery({ limit: 100 });
  const cases = (data?.data ?? []).filter((item) => item.status !== 'CLOSED');
  const layerVisibility = useMemo(
    () =>
      Object.fromEntries(
        MAP_LAYERS.map((layer) => [
          layer.id,
          ['kilimani-ward', 'buildings', 'roads'].includes(layer.id),
        ]),
      ),
    [],
  );

  return (
    <section className="flex h-full min-h-0 w-full flex-col bg-[var(--calcite-color-background)]">
      <header className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--calcite-color-border-1)] bg-[var(--calcite-color-background)] px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <calcite-icon icon="map" scale="m" className="text-[var(--calcite-color-text-2)]" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-[var(--calcite-color-text-1)] sm:text-base">
              Kilimani Ward map
            </h1>
            <p className="hidden text-xs text-[var(--calcite-color-text-2)] sm:block">
              Active development cases and public map layers
            </p>
          </div>
          <calcite-chip className="hidden sm:inline-flex" scale="s" appearance="outline" icon="pin">
            {isLoading
              ? 'Loading cases'
              : isError
                ? 'Case locations unavailable'
                : `${cases.length} active cases`}
          </calcite-chip>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <calcite-button
            appearance="outline"
            scale="s"
            icon-start="list"
            onClick={() => navigate('/community')}
          >
            My reports
          </calcite-button>
          <calcite-button
            appearance="solid"
            scale="s"
            icon-start="plus"
            onClick={() => navigate('/community/report')}
          >
            <span className="hidden sm:inline">New report</span>
            <span className="sm:hidden">Report</span>
          </calcite-button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="absolute inset-0">
              <MapSkeleton />
            </div>
          }
        >
          <KilimaniMap
            cases={cases}
            layerVisibility={layerVisibility}
            showCases
            colorByStatus
            caseLinkPrefix="/community/cases"
            showAttributionFooter
            className="h-full w-full rounded-none border-0"
          />
        </Suspense>
        {isError && (
          <calcite-notice
            className="pointer-events-none absolute bottom-8 left-3 z-20 max-w-[min(28rem,calc(100%-1.5rem))] sm:left-4"
            open
            kind="warning"
            scale="s"
          >
            Case locations could not be loaded. The ward map and its map layers remain available.
          </calcite-notice>
        )}
      </div>
    </section>
  );
}
