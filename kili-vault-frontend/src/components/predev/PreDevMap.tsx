import { useEffect, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
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
  const viewRef = useRef<MapView | null>(null);
  const overlayLayerRef = useRef<GraphicsLayer | null>(null);
  const featureLayersRef = useRef<Partial<Record<SiteInfraLayerId, FeatureLayer>>>({});
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
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

    const map = new Map({ basemap: 'arcgis-topographic' });

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

    const view = new MapView({
      container: containerRef.current,
      map,
      extent: KILIMANI_WARD_EXTENT,
      padding: { top: 48, right: 16, bottom: 72, left: 16 },
    });

    viewRef.current = view;

    const loadingTimeout = window.setTimeout(() => {
      if (destroyed) return;
      setReady(true);
      setMapError('The planning map is taking too long to load. You can still continue with your selected location.');
    }, 15000);

    view.when().then(() => {
      if (!destroyed) {
        window.clearTimeout(loadingTimeout);
        setReady(true);
        setMapError(null);
      }
    }).catch((reason: unknown) => {
      if (destroyed) return;
      window.clearTimeout(loadingTimeout);
      setReady(true);
      setMapError(
        reason instanceof Error
          ? reason.message
          : 'The planning map could not be initialized.',
      );
    });

    const handle = view.on('click', (event: __esri.ViewClickEvent) => {
      const geo = webMercatorUtils.webMercatorToGeographic(event.mapPoint) as Point;
      if (geo.latitude == null || geo.longitude == null) return;
      onPinDropRef.current(geo.latitude, geo.longitude);
    });

    return () => {
      destroyed = true;
      window.clearTimeout(loadingTimeout);
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
        center: [lon, lat],
        zoom: 17,
      })
      .catch(() => undefined);
  }, [lat, lon]);

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
    analyzeSiteProximity(lat, lon, roads, sewer, power)
      .then((result) => {
        if (!cancelled) setProximity(result);
      })
      .catch(() => {
        if (!cancelled) setProximity(null);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  const layerControls = (
    <div className="pointer-events-auto absolute right-3 top-14 z-20 w-60 max-w-[90%] border border-sand bg-[var(--calcite-color-background)] shadow-soft">
      <calcite-block
        heading="Map layers"
        description="Toggle planning context on the map."
        collapsible
      >
        <div className="grid gap-2 px-3 pb-3 pt-2">
          {SITE_INFRA_LAYER_IDS.map((id) => {
            const config = MAP_LAYERS.find((layer) => layer.id === id);
            if (!config) return null;
            return (
              <calcite-label
                key={id}
                layout="inline"
                className="min-w-0 text-xs text-charcoal"
              >
                <calcite-checkbox
                  checked={layerVisibility[id]}
                  oncalciteCheckboxChange={() =>
                    setLayerVisibility((previous) => ({
                      ...previous,
                      [id]: !previous[id],
                    }))
                  }
                />
                <span>{config.title}</span>
              </calcite-label>
            );
          })}
        </div>
      </calcite-block>
    </div>
  );

  return (
    <div
      className={cn(
        'relative min-w-0 overflow-hidden border border-sand bg-[var(--calcite-color-background)]',
        className ?? 'min-h-[280px]',
      )}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full min-h-[inherit]" />
      {!ready && (
        <div className="absolute inset-0 z-10">
          <MapSkeleton />
        </div>
      )}
      {mapError && (
        <div className="pointer-events-none absolute inset-x-3 top-24 z-30 sm:max-w-md">
          <calcite-notice open kind="warning" scale="s">
            <span slot="title">Map unavailable</span>
            {mapError}
          </calcite-notice>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-3 top-3 z-20">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <calcite-chip icon="map" scale="s" className="pointer-events-auto">
            {lat != null && lon != null
              ? 'Site selected — tap to move pin'
              : 'Tap map to set your plot location'}
          </calcite-chip>
          <calcite-chip scale="s">Top-down map</calcite-chip>
        </div>
      </div>

      <calcite-chip
        scale="s"
        className="pointer-events-none absolute left-3 top-14 z-10 max-w-[90%]"
      >
        Dotted rings show 30 m and 50 m proximity guides.
      </calcite-chip>

      {layerControls}

      {lat != null && lon != null && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 w-64 max-w-[90%]">
          <calcite-notice open kind="info" scale="s">
            <span slot="title">Selected site</span>
            <p className="font-mono text-xs font-medium text-charcoal">
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </p>
            {proximity && (
              <div className="mt-1 text-xs text-charcoal-muted">
                <p>{formatRoadProximity(proximity.roadDistanceM)}</p>
                <p>
                  {proximity.inSeweredArea
                    ? 'Inside sewered area'
                    : 'Outside sewered catchment'}
                </p>
                {proximity.nearPowerLine && (
                  <p className="font-medium text-charcoal">
                    Near 11 kV line — wayleave check
                  </p>
                )}
              </div>
            )}
          </calcite-notice>
        </div>
      )}
    </div>
  );
}
