import { useEffect, useMemo, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import SceneView from '@arcgis/core/views/SceneView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import { Maximize2, Minimize2 } from 'lucide-react';
import { MAP_LAYERS, SITE_INFRA_LAYER_IDS, type SiteInfraLayerId } from '@/config/mapLayers';
import { createMapFeatureLayer } from '@/lib/mapFeatureLayer';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import { MapSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import type { DevelopmentCase } from '@/types';

const SITE_LAYERS = SITE_INFRA_LAYER_IDS;

function caseFootprintGeoJSON(caseItem: DevelopmentCase): GeoJSON.FeatureCollection {
  if (!caseItem.geometry) {
    return { type: 'FeatureCollection', features: [] };
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: caseItem.geometry,
        properties: { id: caseItem.id, caseNumber: caseItem.caseNumber },
      },
    ],
  };
}

export function CaseSiteMap({
  caseItem,
  className,
  compact = false,
}: {
  caseItem: DevelopmentCase;
  className?: string;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);
  const featureLayersRef = useRef<Record<string, FeatureLayer>>({});
  const [ready, setReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode3d, setMode3d] = useState(true);
  const [layerVisibility, setLayerVisibility] = useState<Record<SiteInfraLayerId, boolean>>({
    buildings: true,
    roads: true,
    'sewer-areas': true,
    'power-lines': true,
    rivers: false,
    'river-buffer': true,
  });

  const footprint = useMemo(() => caseFootprintGeoJSON(caseItem), [caseItem]);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    const map = new Map({
      basemap: 'satellite',
      ground: 'world-elevation',
    });

    const featureLayers: Record<string, FeatureLayer> = {};
    MAP_LAYERS.filter((l) => SITE_LAYERS.includes(l.id as SiteInfraLayerId)).forEach((config) => {
      const id = config.id as SiteInfraLayerId;
      const layer = createMapFeatureLayer(config, layerVisibility[id] ?? true);
      featureLayers[id] = layer;
      map.add(layer);
    });
    featureLayersRef.current = featureLayers;

    const footprintUrl = URL.createObjectURL(
      new Blob([JSON.stringify(footprint)], { type: 'application/json' }),
    );
    const siteLayer = new GeoJSONLayer({
      url: footprintUrl,
      title: 'This case',
      renderer: {
        type: 'simple',
        symbol: new SimpleFillSymbol({
          color: [196, 120, 90, 0.55],
          outline: new SimpleLineSymbol({ color: [181, 74, 50], width: 3 }),
        }),
      },
      elevationInfo: { mode: 'on-the-ground' },
    });
    map.add(siteLayer);

    const view = new SceneView({
      container: containerRef.current,
      map,
      qualityProfile: 'medium',
      environment: {
        lighting: { directShadowsEnabled: true },
      },
      camera: {
        position: {
          longitude: caseItem.centroidLon,
          latitude: caseItem.centroidLat,
          z: 450,
        },
        tilt: 62,
        heading: 35,
      },
    });

    viewRef.current = view;
    view.when(() => {
      if (!destroyed) setReady(true);
    });

    return () => {
      destroyed = true;
      view.destroy();
      viewRef.current = null;
      featureLayersRef.current = {};
      URL.revokeObjectURL(footprintUrl);
    };
  }, [caseItem.id, footprint, caseItem.centroidLat, caseItem.centroidLon]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view
      .goTo({
        position: {
          longitude: caseItem.centroidLon,
          latitude: caseItem.centroidLat,
          z: mode3d ? 450 : 1400,
        },
        tilt: mode3d ? 62 : 0,
        heading: mode3d ? 35 : 0,
      })
      .catch(() => undefined);
  }, [mode3d, caseItem.centroidLat, caseItem.centroidLon]);

  useEffect(() => {
    SITE_LAYERS.forEach((id) => {
      const layer = featureLayersRef.current[id];
      if (layer) layer.visible = layerVisibility[id] ?? false;
    });
  }, [layerVisibility]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !ready) return;
    const resize = () => {
      const resizable = view as SceneView & { resize?: () => Promise<void> };
      resizable.resize?.().catch(() => undefined);
    };
    const frame = requestAnimationFrame(resize);
    const timer = window.setTimeout(resize, 150);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [isFullscreen, ready, compact]);

  const viewModeToggle = (
    <div className="flex rounded-xl border border-sand bg-off-white p-0.5">
      <button
        type="button"
        onClick={() => setMode3d(false)}
        className={cn(
          'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
          !mode3d ? 'bg-charcoal text-off-white' : 'text-charcoal-muted hover:text-charcoal',
        )}
      >
        2D
      </button>
      <button
        type="button"
        onClick={() => setMode3d(true)}
        className={cn(
          'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
          mode3d ? 'bg-charcoal text-off-white' : 'text-charcoal-muted hover:text-charcoal',
        )}
      >
        3D
      </button>
    </div>
  );

  const layerPills = (
    <div className="flex flex-wrap gap-2">
      {SITE_LAYERS.map((id) => {
        const config = MAP_LAYERS.find((l) => l.id === id);
        if (!config) return null;
        const on = layerVisibility[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }))}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              on
                ? 'border-clay/40 bg-clay/10 text-clay-dark'
                : 'border-sand bg-off-white text-charcoal-muted',
            )}
          >
            {config.title}
          </button>
        );
      })}
    </div>
  );

  const fullscreenToggle = (
    <button
      type="button"
      onClick={() => setIsFullscreen((value) => !value)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
        isFullscreen
          ? 'border-off-white/20 bg-charcoal/80 text-off-white backdrop-blur-sm hover:bg-charcoal'
          : 'border-sand bg-off-white text-charcoal hover:border-clay/40 hover:text-clay-dark',
      )}
      aria-label={isFullscreen ? 'Exit full screen map' : 'Open full screen map'}
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="h-3.5 w-3.5" />
          Exit
        </>
      ) : (
        <>
          <Maximize2 className="h-3.5 w-3.5" />
          Full screen
        </>
      )}
    </button>
  );

  return (
    <>
      {!isFullscreen && compact && (
        <div className="hidden h-36 sm:h-40 lg:block" aria-hidden />
      )}

      <div
        className={cn(
          className,
          isFullscreen
            ? 'fixed inset-0 z-[100] h-[100dvh] w-[100dvw] bg-charcoal'
            : 'space-y-3',
        )}
      >
        {!isFullscreen && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-charcoal">Site map</p>
            <div className="flex items-center gap-2">
              {viewModeToggle}
              {fullscreenToggle}
            </div>
          </div>
        )}

        <div
          className={cn(
            'relative overflow-hidden',
            isFullscreen ? 'h-full w-full' : 'rounded-2xl border border-sand',
            !isFullscreen && (compact ? 'h-36 sm:h-40' : 'h-64 sm:h-72'),
          )}
        >
          <div ref={containerRef} className="absolute inset-0 h-full w-full" />
          {!ready && (
            <div className="absolute inset-0 z-10">
              <MapSkeleton />
            </div>
          )}

          {isFullscreen && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-charcoal/70 to-transparent p-3 sm:p-4">
              <div className="pointer-events-auto flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-off-white">Site map</p>
                  <p className="text-xs text-off-white/75">{caseItem.caseNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {viewModeToggle}
                  {fullscreenToggle}
                </div>
              </div>
            </div>
          )}

          <p
            className={cn(
              'pointer-events-none absolute z-10 rounded-lg px-2.5 py-1 text-[10px] font-medium backdrop-blur-sm',
              isFullscreen
                ? 'bottom-20 left-3 bg-charcoal/75 text-off-white/90 sm:bottom-24'
                : 'bottom-3 left-3 bg-off-white/90 text-charcoal-muted',
            )}
          >
            {mode3d
              ? 'Tilt view · buildings, roads, sewers & power'
              : 'Top-down view'}
          </p>

          {isFullscreen && (
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-charcoal/80 via-charcoal/50 to-transparent p-3 sm:p-4">
              {layerPills}
            </div>
          )}
        </div>

        {!isFullscreen && layerPills}
      </div>
    </>
  );
}
