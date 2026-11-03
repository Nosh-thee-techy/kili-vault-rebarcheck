import { useEffect, useMemo, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
import { KILIMANI_WARD_EXTENT, MAP_LAYERS } from '@/config/mapLayers';
import { CASE_STATUS_COLORS, CHANGE_TYPE_COLORS } from '@/config/theme';
import type { CaseStatus } from '@/types';
import { MapSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import type { DevelopmentCase, ChangeType } from '@/types';

interface KilimaniMapProps {
  cases: DevelopmentCase[];
  detectionsGeoJSON?: GeoJSON.FeatureCollection;
  selectedCaseId?: string | null;
  layerVisibility: Record<string, boolean>;
  showCases: boolean;
  showDetections?: boolean;
  colorByStatus?: boolean;
  onCaseSelect?: (caseId: string) => void;
  className?: string;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function casesToGeoJSON(cases: DevelopmentCase[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cases
      .filter((c) => c.geometry)
      .map((c) => ({
        type: 'Feature' as const,
        id: c.id,
        geometry: c.geometry!,
        properties: {
          id: c.id,
          caseNumber: c.caseNumber,
          changeType: c.changeType,
          status: c.status,
          confidence: c.confidence,
          title: c.title,
        },
      })),
  };
}

function buildCaseRenderer(colorByStatus: boolean): UniqueValueRenderer {
  if (colorByStatus) {
    const statuses = Object.keys(CASE_STATUS_COLORS) as CaseStatus[];
    return new UniqueValueRenderer({
      field: 'status',
      uniqueValueInfos: statuses.map((status) => ({
        value: status,
        symbol: new SimpleFillSymbol({
          color: `${CASE_STATUS_COLORS[status]}44`,
          outline: new SimpleLineSymbol({
            color: CASE_STATUS_COLORS[status],
            width: 2.5,
          }),
        }),
        label: status.replace(/_/g, ' '),
      })),
      defaultSymbol: new SimpleFillSymbol({
        color: '#4A4A4F44',
        outline: new SimpleLineSymbol({ color: '#4A4A4F', width: 1.5 }),
      }),
    });
  }

  const types = Object.keys(CHANGE_TYPE_COLORS) as ChangeType[];
  return new UniqueValueRenderer({
    field: 'changeType',
    uniqueValueInfos: types.map((type) => ({
      value: type,
      symbol: new SimpleFillSymbol({
        color: `${CHANGE_TYPE_COLORS[type]}55`,
        outline: new SimpleLineSymbol({
          color: CHANGE_TYPE_COLORS[type],
          width: 2,
        }),
      }),
      label: type.replace(/_/g, ' '),
    })),
    defaultSymbol: new SimpleFillSymbol({
      color: '#4A4A4F44',
      outline: new SimpleLineSymbol({ color: '#4A4A4F', width: 1.5 }),
    }),
  });
}

function buildDetectionRenderer(): UniqueValueRenderer {
  const types = Object.keys(CHANGE_TYPE_COLORS) as ChangeType[];
  return new UniqueValueRenderer({
    field: 'change_type',
    uniqueValueInfos: types.map((type) => ({
      value: type,
      symbol: new SimpleFillSymbol({
        color: `${CHANGE_TYPE_COLORS[type]}28`,
        outline: new SimpleLineSymbol({
          color: CHANGE_TYPE_COLORS[type],
          width: 1.5,
          style: 'dash',
        }),
      }),
      label: type.replace(/_/g, ' '),
    })),
    defaultSymbol: new SimpleFillSymbol({
      color: '#C4785A22',
      outline: new SimpleLineSymbol({ color: '#C4785A', width: 1.5, style: 'dash' }),
    }),
  });
}

export function KilimaniMap({
  cases,
  detectionsGeoJSON,
  selectedCaseId,
  layerVisibility,
  showCases,
  showDetections = true,
  colorByStatus = false,
  onCaseSelect,
  className,
}: KilimaniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const featureLayersRef = useRef<Record<string, FeatureLayer>>({});
  const casesLayerRef = useRef<GeoJSONLayer | null>(null);
  const detectionsLayerRef = useRef<GeoJSONLayer | null>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mapError, setMapError] = useState<string | null>(null);

  const casesGeoJSON = useMemo(() => casesToGeoJSON(cases), [cases]);
  const detectionsFC = detectionsGeoJSON ?? EMPTY_FC;

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    const featureLayers: Record<string, FeatureLayer> = {};

    const map = new Map({ basemap: 'arcgis-topographic' });

    MAP_LAYERS.forEach((config) => {
      const layer = new FeatureLayer({
        url: `${config.url}/${config.layerId}`,
        title: config.title,
        visible: layerVisibility[config.id] ?? config.defaultVisible,
        opacity: config.geometryType === 'polygon' ? 0.55 : 0.9,
        popupEnabled: true,
      });
      featureLayers[config.id] = layer;
      map.add(layer);
    });

    const detectionsLayer = new GeoJSONLayer({
      url: URL.createObjectURL(
        new Blob([JSON.stringify(detectionsFC)], { type: 'application/json' }),
      ),
      title: 'Kili-Shadows Detections',
      visible: showDetections,
      renderer: buildDetectionRenderer(),
      popupTemplate: {
        title: 'Detection {id}',
        content: `
          <div style="font-family: Montserrat, sans-serif; font-size: 13px; line-height: 1.5;">
            <p><strong>Change:</strong> {change_type}</p>
            <p><strong>Confidence:</strong> {confidence}</p>
            <p><em>Candidate — not yet a workflow case</em></p>
          </div>
        `,
      },
    });
    map.add(detectionsLayer);

    const casesLayer = new GeoJSONLayer({
      url: URL.createObjectURL(
        new Blob([JSON.stringify(casesGeoJSON)], { type: 'application/json' }),
      ),
      title: 'Kili-Shadows Cases',
      visible: showCases,
      renderer: buildCaseRenderer(colorByStatus),
      popupTemplate: {
        title: '{caseNumber}',
        content: `
          <div style="font-family: Montserrat, sans-serif; font-size: 13px; line-height: 1.5;">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Change:</strong> {changeType}</p>
            <p><strong>Confidence:</strong> {confidence}</p>
          </div>
        `,
      },
    });
    map.add(casesLayer);

    const view = new MapView({
      container: containerRef.current,
      map,
      extent: KILIMANI_WARD_EXTENT,
      padding: { top: 48, right: 24, bottom: 48, left: 24 },
      constraints: {
        geometry: KILIMANI_WARD_EXTENT,
        minScale: 500000,
      },
      popup: {
        dockEnabled: true,
        dockOptions: { position: 'bottom-right', breakpoint: false },
      },
    });

    viewRef.current = view;
    featureLayersRef.current = featureLayers;
    casesLayerRef.current = casesLayer;
    detectionsLayerRef.current = detectionsLayer;

    view
      .when(() => {
        if (!destroyed) setMapStatus('ready');
      })
      .catch((err: Error) => {
        if (!destroyed) {
          setMapStatus('error');
          setMapError(err.message || 'Failed to initialize map');
        }
      });

    const clickHandle = view.on('click', async (event) => {
      const response = await view.hitTest(event);
      const caseGraphic = response.results.find(
        (result) => result.type === 'graphic' && result.graphic.layer === casesLayer,
      );
      if (caseGraphic && caseGraphic.type === 'graphic') {
        const caseId = caseGraphic.graphic.attributes.id as string;
        onCaseSelect?.(caseId);
      }
    });

    return () => {
      destroyed = true;
      clickHandle.remove();
      view.destroy();
      viewRef.current = null;
      featureLayersRef.current = {};
      casesLayerRef.current = null;
      detectionsLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    MAP_LAYERS.forEach((config) => {
      const layer = featureLayersRef.current[config.id];
      if (layer) {
        layer.visible = layerVisibility[config.id] ?? config.defaultVisible;
      }
    });
  }, [layerVisibility]);

  useEffect(() => {
    if (casesLayerRef.current) {
      casesLayerRef.current.visible = showCases;
    }
  }, [showCases]);

  useEffect(() => {
    if (detectionsLayerRef.current) {
      detectionsLayerRef.current.visible = showDetections;
    }
  }, [showDetections]);

  useEffect(() => {
    const layer = casesLayerRef.current;
    if (!layer) return;

    const blob = new Blob([JSON.stringify(casesGeoJSON)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    layer.url = url;
    layer.load().catch(() => undefined);

    return () => URL.revokeObjectURL(url);
  }, [casesGeoJSON]);

  useEffect(() => {
    const layer = detectionsLayerRef.current;
    if (!layer) return;

    const blob = new Blob([JSON.stringify(detectionsFC)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    layer.url = url;
    layer.load().catch(() => undefined);

    return () => URL.revokeObjectURL(url);
  }, [detectionsFC]);

  useEffect(() => {
    const view = viewRef.current;
    const layer = casesLayerRef.current;
    if (!view || !layer || !selectedCaseId) return;

    const target = cases.find((c) => c.id === selectedCaseId);
    if (!target?.geometry) return;

    layer
      .queryFeatures({
        where: `id = '${selectedCaseId}'`,
        returnGeometry: true,
        outFields: ['*'],
      })
      .then((result) => {
        if (result.features.length > 0) {
          view.goTo({ target: result.features, zoom: 18 }).catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, [selectedCaseId, cases]);

  if (mapStatus === 'error') {
    return (
      <ErrorState
        title="Map failed to load"
        message={mapError ?? 'Unable to connect to ArcGIS layers. Check your network connection.'}
        variant="network"
        className={className}
      />
    );
  }

  return (
    <div className={`relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-sand ${className ?? ''}`}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {mapStatus === 'loading' && (
        <div className="absolute inset-0 z-10">
          <MapSkeleton />
        </div>
      )}
    </div>
  );
}
