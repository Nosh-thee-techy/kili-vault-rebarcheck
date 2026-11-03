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
import { Home, X } from "lucide-react";
import { KILIMANI_WARD_EXTENT, MAP_LAYERS } from "@/config/mapLayers";
import { createMapFeatureLayer } from "@/lib/mapFeatureLayer";
import { analyzeSiteProximity, type SiteProximity } from "@/lib/siteProximity";
import { CASE_STATUS_COLORS, CHANGE_TYPE_COLORS } from "@/config/theme";
import type { CaseStatus } from "@/types";
import {
  MapSitePreview,
  type MapSelection,
} from "@/components/map/MapSitePreview";
import { MapSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type { DevelopmentCase, ChangeType } from "@/types";
import { areaM2 } from "@/lib/developmentSimulator";

export type PlannerFeatureKind =
  | "parcel"
  | "building"
  | "landuse"
  | "road"
  | "river"
  | "river-buffer"
  | "boundary";

export interface PlannerFeatureSelection {
  kind: PlannerFeatureKind;
  layerId: string;
  layerTitle: string;
  geometry: __esri.Geometry;
  attributes: Record<string, unknown>;
  context?: {
    parcelAreaM2: number | null;
    buildingCount: number | null;
    buildingFootprintM2: number | null;
    roadDistanceM: number | null;
    riverDistanceM: number | null;
    riverBufferOverlap: boolean | null;
  };
}

export interface PlannerDetectionSelection {
  kind: "detection";
  layerId: string;
  layerTitle: string;
  geometry: __esri.Geometry;
  attributes: Record<string, unknown>;
  detectionId: string;
  changeType: string;
  confidence: number;
}

export type PlannerMapSelection =
  | PlannerFeatureSelection
  | PlannerDetectionSelection;

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
  onFeatureSelect?: (selection: PlannerMapSelection | null) => void;
  clearSelectionToken?: number;
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

async function buildFeatureContext(
  layerId: string,
  geometry: __esri.Geometry,
  layers: Record<string, FeatureLayer>,
): Promise<PlannerFeatureSelection["context"]> {
  if (layerId !== "parcels-landuse") return undefined;
  const parcelAreaM2 = areaM2(geometry);
  const searchGeometry = geometryEngine.geodesicBuffer(
    geometry as __esri.Polygon,
    500,
    "meters",
  );
  const query = async (
    layer: FeatureLayer | undefined,
    target: __esri.Geometry,
  ) => {
    if (!layer) return [] as __esri.Graphic[];
    try {
      const result = await layer.queryFeatures({
        where: "1=1",
        geometry: target,
        spatialRelationship: "intersects",
        returnGeometry: true,
        outFields: ["*"],
      });
      return result.features as __esri.Graphic[];
    } catch {
      return [] as __esri.Graphic[];
    }
  };
  const [buildings, roads, rivers, buffers] = await Promise.all([
    query(layers.buildings, geometry),
    query(layers.roads, searchGeometry as __esri.Geometry),
    query(layers.rivers, searchGeometry as __esri.Geometry),
    query(layers["river-buffer"], geometry),
  ]);
  const nearest = (features: __esri.Graphic[]) => {
    const distances = features
      .filter((feature) => feature.geometry)
      .map((feature) =>
        geometryEngine.distance(geometry, feature.geometry, "meters"),
      )
      .filter((distance): distance is number => Number.isFinite(distance));
    return distances.length ? Math.min(...distances) : null;
  };
  return {
    parcelAreaM2,
    buildingCount: buildings.length,
    buildingFootprintM2: buildings.reduce((total, building) => {
      const intersection = building.geometry
        ? geometryEngine.intersect(geometry, building.geometry)
        : null;
      return total + areaM2(intersection);
    }, 0),
    roadDistanceM: nearest(roads),
    riverDistanceM: nearest(rivers),
    riverBufferOverlap: buffers.length > 0,
  };
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
  onFeatureSelect,
  clearSelectionToken = 0,
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
  const onFeatureSelectRef = useRef(onFeatureSelect);
  onFeatureSelectRef.current = onFeatureSelect;
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [mapError, setMapError] = useState<string | null>(null);
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [proximity, setProximity] = useState<SiteProximity | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

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

    const highlightGraphic = async (
      layer: GeoJSONLayer,
      graphic: __esri.Graphic,
    ) => {
      clearHighlight();
      const layerView = await view.whenLayerView(layer);
      highlightHandleRef.current = layerView.highlight(graphic);
    };

    const clickHandle = view.on(
      "click",
      async (event: __esri.ViewClickEvent) => {
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
            onFeatureSelectRef.current?.(null);
            await highlightGraphic(casesLayer, caseHit.graphic);
            setSelection({ kind: "case", caseItem });
            onCaseSelectRef.current?.(caseId);
            view
              .goTo({ target: caseHit.graphic, zoom: 18 })
              .catch(() => undefined);
          }
          return;
        }

        const detectionHit = response.results.find(
          (result: __esri.ViewHit) =>
            result.type === "graphic" &&
            (result as __esri.GraphicHit).graphic.layer === detectionsLayer,
        ) as __esri.GraphicHit | undefined;

        if (detectionHit?.graphic?.geometry) {
          const attrs = detectionHit.graphic.attributes;
          await highlightGraphic(detectionsLayer, detectionHit.graphic);
          setSelection({
            kind: "detection",
            id: String(attrs.id ?? ""),
            changeType: String(attrs.change_type ?? "UNKNOWN"),
            confidence: Number(attrs.confidence ?? 0),
          });
          onFeatureSelectRef.current?.({
            kind: "detection",
            layerId: "detections",
            layerTitle: "Observed spatial change",
            geometry: detectionHit.graphic.geometry,
            attributes: attrs as Record<string, unknown>,
            detectionId: String(attrs.id ?? "Unknown"),
            changeType: String(attrs.change_type ?? "UNKNOWN"),
            confidence: Number(attrs.confidence ?? 0),
          });
          view
            .goTo({ target: detectionHit.graphic, zoom: 18 })
            .catch(() => undefined);
          return;
        }

        const featureHit = response.results.find(
          (result: __esri.ViewHit) =>
            result.type === "graphic" &&
            Object.values(featureLayers).includes(
              (result as __esri.GraphicHit).graphic.layer as FeatureLayer,
            ),
        ) as __esri.GraphicHit | undefined;

        if (featureHit?.graphic?.geometry) {
          const layer = featureHit.graphic.layer as FeatureLayer;
          const layerId = String(layer.id);
          const config = MAP_LAYERS.find((item) => item.id === layerId);
          const attributes = (featureHit.graphic.attributes ?? {}) as Record<
            string,
            unknown
          >;
          const kind: PlannerFeatureKind =
            layerId === "parcels-landuse"
              ? "parcel"
              : layerId === "buildings" || layerId === "buildings-parcel-join"
                ? "building"
                : layerId === "landuse"
                  ? "landuse"
                  : layerId === "roads"
                    ? "road"
                    : layerId === "rivers"
                      ? "river"
                      : layerId === "river-buffer"
                        ? "river-buffer"
                        : "boundary";
          const context = await buildFeatureContext(
            layerId,
            featureHit.graphic.geometry,
            featureLayers,
          );
          const layerView = await view.whenLayerView(layer);
          clearHighlight();
          highlightHandleRef.current = layerView.highlight(featureHit.graphic);
          const selected: PlannerFeatureSelection = {
            kind,
            layerId,
            layerTitle: config?.title ?? layerId,
            geometry: featureHit.graphic.geometry,
            attributes,
            context,
          };
          setSelection(null);
          onFeatureSelectRef.current?.(selected);
          view
            .goTo({
              target: featureHit.graphic,
              zoom: kind === "boundary" ? 15 : 18,
            })
            .catch(() => undefined);
          return;
        }

        clearHighlight();
        setSelection(null);
        onFeatureSelectRef.current?.(null);
      },
    );

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
    if (clearSelectionToken === 0) return;
    highlightHandleRef.current?.remove();
    highlightHandleRef.current = null;
    proximityLayerRef.current?.removeAll();
    setProximity(null);
    setSelection(null);
    onFeatureSelectRef.current?.(null);
  }, [clearSelectionToken]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !searchTerm.trim()) return;
    const value = searchTerm.trim().replace(/'/g, "''");
    const searchConfigs = MAP_LAYERS.filter(
      (config) =>
        config.searchFields?.length &&
        (config.id === "parcels-landuse" ||
          config.id === "buildings-parcel-join"),
    );
    let cancelled = false;
    (async () => {
      for (const config of searchConfigs) {
        const layer = featureLayersRef.current[config.id];
        if (!layer) continue;
        const where = config
          .searchFields!.map((field) => `${field} LIKE '%${value}%'`)
          .join(" OR ");
        try {
          const result = await layer.queryFeatures({
            where,
            returnGeometry: true,
            outFields: ["*"],
          });
          const graphic = result.features[0] as __esri.Graphic | undefined;
          if (!graphic?.geometry || cancelled) continue;
          const layerView = await view.whenLayerView(layer);
          highlightHandleRef.current?.remove();
          highlightHandleRef.current = layerView.highlight(graphic);
          const attributes = (graphic.attributes ?? {}) as Record<
            string,
            unknown
          >;
          const kind: PlannerFeatureKind =
            config.id === "parcels-landuse" ? "parcel" : "building";
          const context = await buildFeatureContext(
            config.id,
            graphic.geometry,
            featureLayersRef.current,
          );
          onFeatureSelectRef.current?.({
            kind,
            layerId: config.id,
            layerTitle: config.title,
            geometry: graphic.geometry,
            attributes,
            context,
          });
          setSearchMessage(null);
          view
            .goTo({ target: graphic, zoom: kind === "parcel" ? 18 : 19 })
            .catch(() => undefined);
          return;
        } catch {
          // Continue to the next searchable layer when one service is unavailable.
        }
      }
      if (!cancelled)
        setSearchMessage("No parcel or building matched that value.");
    })();
    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

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
            color:
              index === 0
                ? "rgba(45, 80, 22, 0.1)"
                : "rgba(196, 120, 90, 0.06)",
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
    analyzeSiteProximity(centroidLat, centroidLon, roads, sewer, power).then(
      (result) => {
        if (!cancelled) setProximity(result);
      },
    );

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
      {mapStatus === "ready" && (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearchMessage(null);
              setSearchTerm(searchValue);
            }}
            className="pointer-events-auto absolute left-4 top-4 z-20 flex w-[min(22rem,calc(100%-2rem))] gap-2"
          >
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search parcel, LR number, or building ID"
              aria-label="Search parcel or building"
              className="min-w-0 flex-1 rounded-xl border border-sand bg-off-white/95 px-3 py-2 text-xs text-charcoal shadow-soft backdrop-blur-md"
            />
            <button
              type="submit"
              className="rounded-xl bg-forest px-3 py-2 text-xs font-semibold text-off-white shadow-soft hover:bg-forest-dark"
            >
              Search
            </button>
          </form>
          {searchMessage && (
            <p className="pointer-events-none absolute left-4 top-16 z-20 rounded-lg border border-clay/30 bg-off-white/95 px-3 py-2 text-xs font-semibold text-clay-dark shadow-soft">
              {searchMessage}
            </p>
          )}
          <div className="pointer-events-auto absolute right-4 top-4 z-20 flex gap-2">
            <button
              type="button"
              onClick={() =>
                viewRef.current
                  ?.goTo(KILIMANI_WARD_EXTENT)
                  .catch(() => undefined)
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-sand bg-off-white/95 px-3 py-2 text-xs font-semibold text-charcoal shadow-soft backdrop-blur-md hover:border-forest"
              aria-label="Zoom to Kilimani"
            >
              <Home className="h-3.5 w-3.5 text-forest" /> Kilimani
            </button>
            {(selection || proximity) && (
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sand bg-off-white/95 px-3 py-2 text-xs font-semibold text-charcoal shadow-soft backdrop-blur-md hover:border-clay"
                aria-label="Clear map selection"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </>
      )}
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
