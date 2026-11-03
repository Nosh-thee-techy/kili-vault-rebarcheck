import { useEffect, useMemo, useRef, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import { KILIMANI_WARD_EXTENT, MAP_LAYERS } from "@/config/mapLayers";
import { createMapFeatureLayer } from "@/lib/mapFeatureLayer";
import { analyzeSiteProximity, type SiteProximity } from "@/lib/siteProximity";
import { CASE_STATUS_COLORS, CHANGE_TYPE_COLORS } from "@/config/theme";
import type { CaseStatus } from "@/types";
import { MapSitePreview, type MapSelection } from "@/components/map/MapSitePreview";
import { MapSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type { DevelopmentCase, ChangeType } from "@/types";

interface KilimaniMapProps {
  cases: DevelopmentCase[];
  detectionsGeoJSON?: GeoJSON.FeatureCollection;
  selectedCaseId?: string | null;
  layerVisibility: Record<string, boolean>;
  showCases: boolean;
  showDetections?: boolean;
  colorByStatus?: boolean;
  onCaseSelect?: (caseId: string) => void;
  caseLinkPrefix?: string;
  className?: string;
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function casesToGeoJSON(cases: DevelopmentCase[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cases
      .filter((c) => c.geometry)
      .map((c) => ({
        type: "Feature" as const,
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
      field: "status",
      uniqueValueInfos: statuses.map((status) => ({
        value: status,
        symbol: new SimpleFillSymbol({
          color: `${CASE_STATUS_COLORS[status]}44`,
          outline: new SimpleLineSymbol({
            color: CASE_STATUS_COLORS[status],
            width: 2.5,
          }),
        }),
        label: status.replace(/_/g, " "),
      })),
      defaultSymbol: new SimpleFillSymbol({
        color: "#4A4A4F44",
        outline: new SimpleLineSymbol({ color: "#4A4A4F", width: 1.5 }),
      }),
    });
  }

  const types = Object.keys(CHANGE_TYPE_COLORS) as ChangeType[];
  return new UniqueValueRenderer({
    field: "changeType",
    uniqueValueInfos: types.map((type) => ({
      value: type,
      symbol: new SimpleFillSymbol({
        color: `${CHANGE_TYPE_COLORS[type]}55`,
        outline: new SimpleLineSymbol({
          color: CHANGE_TYPE_COLORS[type],
          width: 2,
        }),
      }),
      label: type.replace(/_/g, " "),
    })),
    defaultSymbol: new SimpleFillSymbol({
      color: "#4A4A4F44",
      outline: new SimpleLineSymbol({ color: "#4A4A4F", width: 1.5 }),
    }),
  });
}

function buildDetectionRenderer(): UniqueValueRenderer {
  const types = Object.keys(CHANGE_TYPE_COLORS) as ChangeType[];
  return new UniqueValueRenderer({
    field: "change_type",
    uniqueValueInfos: types.map((type) => ({
      value: type,
      symbol: new SimpleFillSymbol({
        color: `${CHANGE_TYPE_COLORS[type]}28`,
        outline: new SimpleLineSymbol({
          color: CHANGE_TYPE_COLORS[type],
          width: 1.5,
          style: "dash",
        }),
      }),
      label: type.replace(/_/g, " "),
    })),
    defaultSymbol: new SimpleFillSymbol({
      color: "#C4785A22",
      outline: new SimpleLineSymbol({
        color: "#C4785A",
        width: 1.5,
        style: "dash",
      }),
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
  caseLinkPrefix = "/planner/cases",
  className,
}: KilimaniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const featureLayersRef = useRef<Record<string, FeatureLayer>>({});
  const proximityLayerRef = useRef<GraphicsLayer | null>(null);
  const casesLayerRef = useRef<GeoJSONLayer | null>(null);
  const detectionsLayerRef = useRef<GeoJSONLayer | null>(null);
  const highlightHandleRef = useRef<__esri.Handle | null>(null);
  const casesRef = useRef(cases);
  casesRef.current = cases;
  const onCaseSelectRef = useRef(onCaseSelect);
  onCaseSelectRef.current = onCaseSelect;
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [mapError, setMapError] = useState<string | null>(null);
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [proximity, setProximity] = useState<SiteProximity | null>(null);

  const casesGeoJSON = useMemo(() => casesToGeoJSON(cases), [cases]);
  const detectionsFC = detectionsGeoJSON ?? EMPTY_FC;

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    const featureLayers: Record<string, FeatureLayer> = {};

    const map = new Map({ basemap: "arcgis-topographic" });

    MAP_LAYERS.forEach((config) => {
      const layer = createMapFeatureLayer(
        config,
        layerVisibility[config.id] ?? config.defaultVisible,
      );
      featureLayers[config.id] = layer;
      map.add(layer);
    });

    const proximityLayer = new GraphicsLayer({ title: "Road proximity guide" });
    map.add(proximityLayer);
    proximityLayerRef.current = proximityLayer;

    const detectionsLayer = new GeoJSONLayer({
      url: URL.createObjectURL(
        new Blob([JSON.stringify(detectionsFC)], { type: "application/json" }),
      ),
      title: "Kili-Shadows Detections",
      visible: showDetections,
      renderer: buildDetectionRenderer(),
      popupTemplate: {
        title: "Detection {id}",
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
        new Blob([JSON.stringify(casesGeoJSON)], { type: "application/json" }),
      ),
      title: "Kili-Shadows Cases",
      visible: showCases,
      renderer: buildCaseRenderer(colorByStatus),
      popupTemplate: {
        title: "{caseNumber}",
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
        dockOptions: { position: "bottom-right", breakpoint: false },
      },
    });

    viewRef.current = view;
    featureLayersRef.current = featureLayers;
    casesLayerRef.current = casesLayer;
    detectionsLayerRef.current = detectionsLayer;

    view
      .when(() => {
        if (!destroyed) setMapStatus("ready");
      })
      .catch((err: Error) => {
        if (!destroyed) {
          setMapStatus("error");
          setMapError(err.message || "Failed to initialize map");
        }
      });

    const clearHighlight = () => {
      highlightHandleRef.current?.remove();
      highlightHandleRef.current = null;
    };

    const highlightGraphic = async (layer: GeoJSONLayer, graphic: __esri.Graphic) => {
      clearHighlight();
      const layerView = await view.whenLayerView(layer);
      highlightHandleRef.current = layerView.highlight(graphic);
    };

    const clickHandle = view.on("click", async (event: __esri.ViewClickEvent) => {
      const response = await view.hitTest(event);
      const caseHit = response.results.find(
        (result: __esri.ViewHit) =>
          result.type === "graphic" &&
          (result as __esri.GraphicHit).graphic.layer === casesLayer,
      ) as __esri.GraphicHit | undefined;

      if (caseHit?.graphic) {
        const caseId = caseHit.graphic.attributes.id as string;
        const caseItem = casesRef.current.find((item) => item.id === caseId);
        if (caseItem) {
          await highlightGraphic(casesLayer, caseHit.graphic);
          setSelection({ kind: "case", caseItem });
          onCaseSelectRef.current?.(caseId);
          view.goTo({ target: caseHit.graphic, zoom: 18 }).catch(() => undefined);
        }
        return;
      }

      const detectionHit = response.results.find(
        (result: __esri.ViewHit) =>
          result.type === "graphic" &&
          (result as __esri.GraphicHit).graphic.layer === detectionsLayer,
      ) as __esri.GraphicHit | undefined;

      if (detectionHit?.graphic) {
        const attrs = detectionHit.graphic.attributes;
        await highlightGraphic(detectionsLayer, detectionHit.graphic);
        setSelection({
          kind: "detection",
          id: String(attrs.id ?? ""),
          changeType: String(attrs.change_type ?? "UNKNOWN"),
          confidence: Number(attrs.confidence ?? 0),
        });
        view.goTo({ target: detectionHit.graphic, zoom: 18 }).catch(() => undefined);
        return;
      }

      clearHighlight();
      setSelection(null);
    });

    return () => {
      destroyed = true;
      clickHandle.remove();
      highlightHandleRef.current?.remove();
      highlightHandleRef.current = null;
      view.destroy();
      viewRef.current = null;
      featureLayersRef.current = {};
      proximityLayerRef.current = null;
      casesLayerRef.current = null;
      detectionsLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = proximityLayerRef.current;
    const roads = featureLayersRef.current.roads;
    const sewer = featureLayersRef.current["sewer-areas"];
    const power = featureLayersRef.current["power-lines"];
    if (!layer) return;

    layer.removeAll();
    setProximity(null);

    if (!selection || selection.kind !== "case" || !roads) return;

    const { centroidLat, centroidLon } = selection.caseItem;
    if (centroidLat == null || centroidLon == null) return;

    const point = new Point({ longitude: centroidLon, latitude: centroidLat });
    const buffers = geometryEngine.geodesicBuffer(point, [30, 50], "meters");
    const ringGeometries = Array.isArray(buffers) ? buffers : [buffers];

    ringGeometries.forEach((geometry, index) => {
      layer.add(
        new Graphic({
          geometry,
          symbol: new SimpleFillSymbol({
            color: index === 0 ? "rgba(45, 80, 22, 0.1)" : "rgba(196, 120, 90, 0.06)",
            outline: new SimpleLineSymbol({
              color: index === 0 ? "#2D5016" : "#C4785A",
              width: 1.5,
              style: "dash",
            }),
          }) as __esri.SimpleFillSymbol,
        }),
      );
    });

    let cancelled = false;
    analyzeSiteProximity(centroidLat, centroidLon, roads, sewer, power).then((result) => {
      if (!cancelled) setProximity(result);
    });

    return () => {
      cancelled = true;
    };
  }, [selection]);

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

    const blob = new Blob([JSON.stringify(casesGeoJSON)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    layer.url = url;
    layer.load().catch(() => undefined);

    return () => URL.revokeObjectURL(url);
  }, [casesGeoJSON]);

  useEffect(() => {
    const layer = detectionsLayerRef.current;
    if (!layer) return;

    const blob = new Blob([JSON.stringify(detectionsFC)], {
      type: "application/json",
    });
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
    if (!target) return;

    setSelection({ kind: "case", caseItem: target });

    if (!target.geometry) return;

    layer
      .queryFeatures({
        where: `id = '${selectedCaseId}'`,
        returnGeometry: true,
        outFields: ["*"],
      })
      .then(async (result: __esri.FeatureSet) => {
        if (result.features.length > 0) {
          const feature = result.features[0];
          const layerView = await view.whenLayerView(layer);
          highlightHandleRef.current?.remove();
          highlightHandleRef.current = layerView.highlight(feature);
          view
            .goTo({ target: result.features, zoom: 18 })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, [selectedCaseId, cases]);

  const clearSelection = () => {
    highlightHandleRef.current?.remove();
    highlightHandleRef.current = null;
    proximityLayerRef.current?.removeAll();
    setProximity(null);
    setSelection(null);
  };

  if (mapStatus === "error") {
    return (
      <ErrorState
        title="Map failed to load"
        message={
          mapError ??
          "Unable to connect to ArcGIS layers. Check your network connection."
        }
        variant="network"
        className={className}
      />
    );
  }

  return (
    <div
      className={`relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-sand ${className ?? ""}`}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {mapStatus === "loading" && (
        <div className="absolute inset-0 z-10">
          <MapSkeleton />
        </div>
      )}

      {selection && mapStatus === "ready" && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 sm:bottom-6 sm:left-6">
          <MapSitePreview
            selection={selection}
            caseLinkPrefix={caseLinkPrefix}
            proximity={proximity}
            onClose={clearSelection}
          />
        </div>
      )}

      {!selection && mapStatus === "ready" && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-full border border-off-white/60 bg-off-white/90 px-3 py-1.5 text-xs font-semibold text-charcoal-muted shadow-soft backdrop-blur-md sm:bottom-6 sm:left-6">
          Tap a site to preview
        </div>
      )}
    </div>
  );
}
