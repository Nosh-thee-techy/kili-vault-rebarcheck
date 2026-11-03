import { useEffect, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import SceneView from '@arcgis/core/views/SceneView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import {
  KILIMANI_WARD_EXTENT,
  MAP_LAYERS,
  SITE_INFRA_LAYER_IDS,
  type SiteInfraLayerId,
} from '@/config/mapLayers';
import { createMapFeatureLayer } from '@/lib/mapFeatureLayer';
import {
  analyzeSiteProximity,
  formatRoadProximity,
  type SiteProximity,
} from '@/lib/siteProximity';
import { MapSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

interface PreDevMapProps {
  lat: number | null;
  lon: number | null;
  onPinDrop: (lat: number, lon: number) => void;
  className?: string;
}

const DEFAULT_LAYER_VISIBILITY: Record<SiteInfraLayerId, boolean> = {
  buildings: true,
  roads: true,
  'sewer-areas': true,
  'power-lines': true,
  rivers: false,
  'river-buffer': false,
};

function proximityRingSymbol(meters: number, fill: string, outline: string) {
  return new SimpleFillSymbol({
    color: fill,
    outline: new SimpleLineSymbol({
      color: outline,
      width: meters <= 30 ? 2 : 1.5,
      style: meters <= 30 ? 'dash' : 'dot',
    }),
  });
}

export function PreDevMap({ lat, lon, onPinDrop, className }: PreDevMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);
  const overlayLayerRef = useRef<GraphicsLayer | null>(null);
  const featureLayersRef = useRef<Partial<Record<SiteInfraLayerId, FeatureLayer>>>({});
  const [ready, setReady] = useState(false);
  const [mode3d, setMode3d] = useState(true);
  const [layerVisibility, setLayerVisibility] =
    useState<Record<SiteInfraLayerId, boolean>>(DEFAULT_LAYER_VISIBILITY);
  const [proximity, setProximity] = useState<SiteProximity | null>(null);

  const onPinDropRef = useRef(onPinDrop);
  onPinDropRef.current = onPinDrop;

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    const overlayLayer = new GraphicsLayer({ title: 'Site pin & proximity' });
    overlayLayerRef.current = overlayLayer;

    const map = new Map({
      basemap: 'satellite',
      ground: 'world-elevation',
    });

    const featureLayers: Partial<Record<SiteInfraLayerId, FeatureLayer>> = {};
    MAP_LAYERS.filter((config) =>
      SITE_INFRA_LAYER_IDS.includes(config.id as SiteInfraLayerId),
    ).forEach((config) => {
      const id = config.id as SiteInfraLayerId;
      const layer = createMapFeatureLayer(
        config,
        layerVisibility[id] ?? DEFAULT_LAYER_VISIBILITY[id],
      );
      featureLayers[id] = layer;
      map.add(layer);
    });
    featureLayersRef.current = featureLayers;
    map.add(overlayLayer);

    const view = new SceneView({
      container: containerRef.current,
      map,
      qualityProfile: 'medium',
      environment: { lighting: { directShadowsEnabled: true } },
      extent: KILIMANI_WARD_EXTENT,
      padding: { top: 48, right: 16, bottom: 72, left: 16 },
      camera: {
        position: { longitude: 36.782, latitude: -1.2921, z: 1200 },
        tilt: 55,
        heading: 25,
      },
    });

    viewRef.current = view;

    view.when(() => {
      if (!destroyed) setReady(true);
    });

    const handle = view.on('click', (event: __esri.ViewClickEvent) => {
      const geo = webMercatorUtils.webMercatorToGeographic(event.mapPoint) as Point;
      if (geo.latitude == null || geo.longitude == null) return;
      onPinDropRef.current(geo.latitude, geo.longitude);
    });

    return () => {
      destroyed = true;
      handle.remove();
      view.destroy();
      viewRef.current = null;
      overlayLayerRef.current = null;
      featureLayersRef.current = {};
    };
  }, []);

  useEffect(() => {
    SITE_INFRA_LAYER_IDS.forEach((id) => {
      const layer = featureLayersRef.current[id];
      if (layer) layer.visible = layerVisibility[id];
    });
  }, [layerVisibility]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || lat == null || lon == null) return;

    view
      .goTo({
        position: { longitude: lon, latitude: lat, z: mode3d ? 420 : 1400 },
        tilt: mode3d ? 62 : 0,
        heading: mode3d ? 35 : 0,
      })
      .catch(() => undefined);
  }, [mode3d, lat, lon]);

  useEffect(() => {
    const overlay = overlayLayerRef.current;
    if (!overlay) return;

    overlay.removeAll();
    if (lat == null || lon == null) {
      setProximity(null);
      return;
    }

    const point = new Point({ longitude: lon, latitude: lat });
    const buffers = geometryEngine.geodesicBuffer(point, [30, 50], 'meters');
    const ringGeometries = Array.isArray(buffers) ? buffers : [buffers];

    ringGeometries.forEach((geometry, index) => {
      overlay.add(
        new Graphic({
          geometry,
          symbol: proximityRingSymbol(
            index === 0 ? 30 : 50,
            index === 0 ? 'rgba(45, 80, 22, 0.12)' : 'rgba(196, 120, 90, 0.08)',
            index === 0 ? 'rgba(45, 80, 22, 0.85)' : 'rgba(196, 120, 90, 0.75)',
          ) as __esri.SymbolUnion,
        }),
      );
    });

    overlay.add(
      new Graphic({
        geometry: point,
        symbol: new SimpleMarkerSymbol({
          color: [196, 120, 90, 0.2],
          size: 30,
          outline: { color: '#C4785A', width: 2 },
        }),
      }),
    );
    overlay.add(
      new Graphic({
        geometry: point,
        symbol: new SimpleMarkerSymbol({
          color: '#C4785A',
          size: 14,
          outline: { color: '#2D5016', width: 2 },
        }),
      }),
    );

    const roads = featureLayersRef.current.roads;
    const sewer = featureLayersRef.current['sewer-areas'];
    const power = featureLayersRef.current['power-lines'];
    if (!roads) return;

    let cancelled = false;
    analyzeSiteProximity(lat, lon, roads, sewer, power).then((result) => {
      if (!cancelled) setProximity(result);
    });

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  const viewModeToggle = (
    <div className="pointer-events-auto flex rounded-xl border border-sand bg-off-white/95 p-0.5 shadow-soft backdrop-blur-md">
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
    <div className="pointer-events-auto flex flex-wrap gap-2">
      {SITE_INFRA_LAYER_IDS.map((id) => {
        const config = MAP_LAYERS.find((layer) => layer.id === id);
        if (!config) return null;
        const on = layerVisibility[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }))}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors backdrop-blur-md',
              on
                ? 'border-clay/40 bg-clay/10 text-clay-dark'
                : 'border-sand bg-off-white/90 text-charcoal-muted',
            )}
          >
            {config.title}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-sand',
        className ?? 'min-h-[280px]',
      )}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full min-h-[inherit]" />
      {!ready && (
        <div className="absolute inset-0 z-10">
          <MapSkeleton />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-off-white/90 via-off-white/50 to-transparent p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="rounded-full border border-off-white/60 bg-off-white/90 px-3 py-1 text-xs font-semibold text-forest shadow-soft backdrop-blur-md">
            {lat != null && lon != null
              ? 'Site selected — tap to move pin'
              : 'Tap map to set your plot location'}
          </div>
          {viewModeToggle}
        </div>
      </div>

      <p className="pointer-events-none absolute left-3 top-14 z-10 rounded-lg bg-off-white/90 px-2.5 py-1 text-[10px] font-medium text-charcoal-muted backdrop-blur-sm">
        {mode3d
          ? '3D tilt · buildings, roads, sewers & power'
          : 'Top-down · dashed ring = 30 m road setback guide'}
      </p>

      {lat != null && lon != null && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 max-w-[14rem] space-y-2">
          <div className="rounded-xl border border-clay/30 bg-off-white/95 px-3 py-2 text-right shadow-soft backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-clay-dark">
              Selected site
            </p>
            <p className="font-mono text-xs font-semibold text-charcoal">
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </p>
          </div>
          {proximity && (
            <div className="rounded-xl border border-forest/20 bg-off-white/95 px-3 py-2 text-right shadow-soft backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest">
                Infrastructure
              </p>
              <p className="mt-1 text-xs font-medium text-charcoal">
                {formatRoadProximity(proximity.roadDistanceM)}
              </p>
              <p className="mt-0.5 text-xs text-charcoal-muted">
                {proximity.inSeweredArea ? 'Inside sewered area' : 'Outside sewered catchment'}
              </p>
              {proximity.nearPowerLine && (
                <p className="mt-0.5 text-xs font-medium text-clay-dark">
                  Near 11 kV line — wayleave check
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-off-white/95 via-off-white/70 to-transparent p-3">
        {layerPills}
      </div>
    </div>
  );
}
