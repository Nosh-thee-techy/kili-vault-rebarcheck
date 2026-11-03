import { useEffect, useMemo, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import SceneView from '@arcgis/core/views/SceneView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import Expand from '@arcgis/core/widgets/Expand';
import LayerList from '@arcgis/core/widgets/LayerList';
import Legend from '@arcgis/core/widgets/Legend';
import { MAP_LAYERS, SITE_INFRA_LAYER_IDS, type SiteInfraLayerId } from '@/config/mapLayers';
import { createMapFeatureLayer } from '@/lib/mapFeatureLayer';
import { cn } from '@/lib/cn';
import type { DevelopmentCase } from '@/types';

const DEFAULT_LAYER_VISIBILITY: Record<SiteInfraLayerId, boolean> = {
  buildings: true,
  roads: true,
  'sewer-areas': true,
  'power-lines': true,
  rivers: false,
  'river-buffer': true,
};

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
}: {
  caseItem: DevelopmentCase;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);
  const [ready, setReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode3d, setMode3d] = useState(true);

  const footprint = useMemo(() => caseFootprintGeoJSON(caseItem), [caseItem]);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    setReady(false);

    const map = new Map({
      basemap: 'satellite',
      ground: 'world-elevation',
    });

    MAP_LAYERS.filter((layerConfig) =>
      SITE_INFRA_LAYER_IDS.includes(layerConfig.id as SiteInfraLayerId),
    ).forEach((layerConfig) => {
      const id = layerConfig.id as SiteInfraLayerId;
      const layer = createMapFeatureLayer(layerConfig, DEFAULT_LAYER_VISIBILITY[id]);
      map.add(layer);
    });

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

    const layerList = new LayerList({ view });
    const layerListExpand = new Expand({
      view,
      content: layerList,
      expandIcon: 'layers',
      expandTooltip: 'Map layers',
    });
    const legend = new Legend({ view });
    const legendExpand = new Expand({
      view,
      content: legend,
      expandIcon: 'legend',
      expandTooltip: 'Map legend',
    });
    view.ui.add(layerListExpand, 'top-right');
    view.ui.add(legendExpand, 'top-right');

    view.when(() => {
      if (!destroyed) setReady(true);
    });

    return () => {
      destroyed = true;
      layerListExpand.destroy();
      legendExpand.destroy();
      view.destroy();
      viewRef.current = null;
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
  }, [isFullscreen, ready]);

  const viewModeToggle = (
    <div className="flex items-center gap-1">
      <calcite-button
        appearance={mode3d ? 'outline' : 'solid'}
        scale="s"
        aria-pressed={!mode3d}
        onClick={() => setMode3d(false)}
      >
        2D
      </calcite-button>
      <calcite-button
        appearance={mode3d ? 'solid' : 'outline'}
        scale="s"
        aria-pressed={mode3d}
        onClick={() => setMode3d(true)}
      >
        3D
      </calcite-button>
    </div>
  );

  const fullscreenToggle = (
    <calcite-button
      appearance="outline"
      scale="s"
      icon-start={isFullscreen ? 'minimize' : 'maximize'}
      onClick={() => setIsFullscreen((value) => !value)}
      aria-label={isFullscreen ? 'Exit full screen map' : 'Open full screen map'}
    >
      {isFullscreen ? 'Exit' : 'Full screen'}
    </calcite-button>
  );

  return (
    <div
      className={cn(
        className,
        'flex h-full min-h-0 w-full flex-col',
        isFullscreen && 'fixed inset-0 z-[100] bg-[var(--calcite-color-background)]',
      )}
    >
      {!isFullscreen && (
        <div className="flex min-h-10 shrink-0 items-center justify-between gap-2 border-b border-sand bg-[var(--calcite-color-background)] px-3 py-1.5">
          <p className="text-sm font-semibold text-charcoal">Site context</p>
          <div className="flex items-center gap-2">
            {viewModeToggle}
            {fullscreenToggle}
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[var(--calcite-color-background)]">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--calcite-color-background)]/85">
            <calcite-loader label="Loading case map" scale="m" />
          </div>
        )}

        {isFullscreen && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-[var(--calcite-color-background)]/95 p-3">
            <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">Site context</p>
                <p className="text-xs text-charcoal-muted">{caseItem.caseNumber}</p>
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
            'pointer-events-none absolute bottom-3 left-3 z-10 rounded bg-[var(--calcite-color-background)]/90 px-2 py-1 text-[11px] text-charcoal-muted',
            isFullscreen && 'bottom-4',
          )}
        >
          {mode3d ? '3D view · buildings, roads, sewers and power' : '2D view'}
        </p>
      </div>
    </div>
  );
}
