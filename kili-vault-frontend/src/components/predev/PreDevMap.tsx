import { useEffect, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import { KILIMANI_WARD_EXTENT } from '@/config/mapLayers';
import { MapSkeleton } from '@/components/ui/Skeleton';

interface PreDevMapProps {
  lat: number | null;
  lon: number | null;
  onPinDrop: (lat: number, lon: number) => void;
  className?: string;
}

export function PreDevMap({ lat, lon, onPinDrop, className }: PreDevMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const pinLayerRef = useRef<GraphicsLayer | null>(null);
  const [ready, setReady] = useState(false);

  const onPinDropRef = useRef(onPinDrop);
  onPinDropRef.current = onPinDrop;

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    const pinLayer = new GraphicsLayer({ title: 'Proposed plot pin' });
    pinLayerRef.current = pinLayer;

    const map = new Map({
      basemap: 'arcgis-topographic',
      layers: [pinLayer],
    });

    const view = new MapView({
      container: containerRef.current,
      map,
      extent: KILIMANI_WARD_EXTENT,
      padding: { top: 24, right: 16, bottom: 24, left: 16 },
      constraints: { geometry: KILIMANI_WARD_EXTENT, minScale: 500000 },
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
      pinLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = pinLayerRef.current;
    if (!layer) return;

    layer.removeAll();
    if (lat == null || lon == null) return;

    const point = new Point({ longitude: lon, latitude: lat });
    const graphic = new Graphic({
      geometry: point,
      symbol: new SimpleMarkerSymbol({
        color: '#C4785A',
        size: 14,
        outline: { color: '#2D5016', width: 2 },
      }),
    });
    layer.add(graphic);

    const view = viewRef.current;
    if (view) {
      view.goTo({ center: [lon, lat], zoom: 17 }).catch(() => undefined);
    }
  }, [lat, lon]);

  return (
    <div
      className={`relative min-h-[280px] overflow-hidden rounded-2xl border border-sand ${className ?? ''}`}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 z-10">
          <MapSkeleton />
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-off-white/60 bg-off-white/90 px-3 py-1 text-xs font-semibold text-forest shadow-soft backdrop-blur-md">
        Tap map to set location
      </div>
    </div>
  );
}
