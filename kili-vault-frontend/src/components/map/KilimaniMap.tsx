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
import Measurement from "@arcgis/core/widgets/Measurement";
import Sketch from "@arcgis/core/widgets/Sketch";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import Expand from "@arcgis/core/widgets/Expand";
import Home from "@arcgis/core/widgets/Home";
import LayerList from "@arcgis/core/widgets/LayerList";
import {
  KILIMANI_WARD_EXTENT,
  MAP_LAYERS,
  type MapLayerConfig,
} from "@/config/mapLayers";
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
  selectedDetectionId?: string | null;
  layerVisibility: Record<string, boolean>;
  showCases: boolean;
  showDetections?: boolean;
  colorByStatus?: boolean;
  onCaseSelect?: (caseId: string) => void;
  caseLinkPrefix?: string;
  onFeatureSelect?: (selection: PlannerMapSelection | null) => void;
  clearSelectionToken?: number;
  mapLayers?: MapLayerConfig[];
  enablePlannerTools?: boolean;
  className?: string;
}

type PlannerTool = "measurement" | "sketch" | "buffer" | "checks";
type ConstraintCheckState = "intersects" | "clear" | "unavailable" | "error";

interface ConstraintCheck {
  title: string;
  state: ConstraintCheckState;
  count?: number;
}

interface ParcelBufferResult {
  distanceMeters: number;
  features: __esri.Graphic[];
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
    query(layers["buildings-parcels"] ?? layers.buildings, geometry),
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
  selectedDetectionId,
  layerVisibility,
  showCases,
  showDetections = true,
  colorByStatus = false,
  onCaseSelect,
  caseLinkPrefix = "/planner/cases",
  onFeatureSelect,
  clearSelectionToken = 0,
  mapLayers = MAP_LAYERS,
  enablePlannerTools = false,
  className,
}: KilimaniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementContainerRef = useRef<HTMLDivElement>(null);
  const sketchContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const featureLayersRef = useRef<Record<string, FeatureLayer>>({});
  const proximityLayerRef = useRef<GraphicsLayer | null>(null);
  const analysisLayerRef = useRef<GraphicsLayer | null>(null);
  const sketchLayerRef = useRef<GraphicsLayer | null>(null);
  const measurementRef = useRef<Measurement | null>(null);
  const sketchWidgetRef = useRef<Sketch | null>(null);
  const analysisRunRef = useRef(0);
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
  const [plannerFeature, setPlannerFeature] =
    useState<PlannerFeatureSelection | null>(null);
  const [proximity, setProximity] = useState<SiteProximity | null>(null);
  const [plannerToolsOpen, setPlannerToolsOpen] = useState(false);
  const [activePlannerTool, setActivePlannerTool] =
    useState<PlannerTool | null>(null);
  const [measurementMode, setMeasurementMode] = useState<"distance" | "area">(
    "distance",
  );
  const [bufferDistance, setBufferDistance] = useState("200");
  const [bufferLoading, setBufferLoading] = useState(false);
  const [bufferResult, setBufferResult] =
    useState<ParcelBufferResult | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [constraintChecks, setConstraintChecks] =
    useState<ConstraintCheck[] | null>(null);
  const [checksLoading, setChecksLoading] = useState(false);
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

    mapLayers.forEach((config) => {
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

    const analysisLayer = new GraphicsLayer({
      title: "Temporary spatial analysis",
    });
    const sketchLayer = new GraphicsLayer({
      title: "Temporary site sketches",
    });
    map.addMany([analysisLayer, sketchLayer]);
    analysisLayerRef.current = analysisLayer;
    sketchLayerRef.current = sketchLayer;

    const detectionsLayer = new GeoJSONLayer({
      url: URL.createObjectURL(
        new Blob([JSON.stringify(detectionsFC)], { type: "application/json" }),
      ),
      title: "Kili-Shadows Detections",
      visible: showDetections,
      renderer: buildDetectionRenderer(),
      popupEnabled: false,
    });
    map.add(detectionsLayer);

    const casesLayer = new GeoJSONLayer({
      url: URL.createObjectURL(
        new Blob([JSON.stringify(casesGeoJSON)], { type: "application/json" }),
      ),
      title: "Kili-Shadows Cases",
      visible: showCases,
      renderer: buildCaseRenderer(colorByStatus),
      popupEnabled: false,
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

    const basemapGallery = new BasemapGallery({ view });
    const basemapExpand = new Expand({
      view,
      content: basemapGallery,
      group: "top-right",
      expandTooltip: "Basemaps",
      collapseTooltip: "Close basemaps",
    });
    const homeWidget = new Home({ view });
    view.ui.add(homeWidget, "bottom-left");
    const layerList = new LayerList({ view });
    const layerExpand = new Expand({
      view,
      content: layerList,
      group: "top-right",
      expandTooltip: "Layers",
      collapseTooltip: "Close layers",
    });
    view.ui.add(basemapExpand, "top-right", 0);
    view.ui.add(layerExpand, "top-right", 1);

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
        if (
          measurementRef.current?.activeTool ||
          sketchWidgetRef.current?.activeTool
        ) {
          return;
        }
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
            setPlannerFeature(null);
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
          setPlannerFeature(null);
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

        const featureHits = response.results.filter(
          (result: __esri.ViewHit) =>
            result.type === "graphic" &&
            Object.values(featureLayers).includes(
              (result as __esri.GraphicHit).graphic.layer as FeatureLayer,
            ),
        ) as __esri.GraphicHit[];
        const featureHit =
          featureHits.find(
            (result) =>
              (result.graphic.layer as FeatureLayer).id === "buildings-parcels",
          ) ??
          featureHits.find(
            (result) =>
              (result.graphic.layer as FeatureLayer).id === "parcels-landuse",
          ) ?? featureHits[0];

        if (featureHit?.graphic?.geometry) {
          const layer = featureHit.graphic.layer as FeatureLayer;
          const layerId = String(layer.id);
          const config = mapLayers.find((item) => item.id === layerId);
          const attributes = (featureHit.graphic.attributes ?? {}) as Record<
            string,
            unknown
          >;
          const kind: PlannerFeatureKind =
            layerId === "parcels-landuse"
              ? "parcel"
              : ["buildings", "buildings-parcels"].includes(layerId)
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
          setPlannerFeature(selected);
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
        setPlannerFeature(null);
        onFeatureSelectRef.current?.(null);
      },
    );

    return () => {
      destroyed = true;
      analysisRunRef.current += 1;
      clickHandle.remove();
      homeWidget.destroy();
      basemapExpand.destroy();
      basemapGallery.destroy();
      layerExpand.destroy();
      layerList.destroy();
      measurementRef.current?.destroy();
      measurementRef.current = null;
      sketchWidgetRef.current?.destroy();
      sketchWidgetRef.current = null;
      highlightHandleRef.current?.remove();
      highlightHandleRef.current = null;
      view.destroy();
      viewRef.current = null;
      featureLayersRef.current = {};
      proximityLayerRef.current = null;
      analysisLayerRef.current = null;
      sketchLayerRef.current = null;
      casesLayerRef.current = null;
      detectionsLayerRef.current = null;
    };
  }, [mapLayers]);

  useEffect(() => {
    if (clearSelectionToken === 0) return;
    highlightHandleRef.current?.remove();
    highlightHandleRef.current = null;
    proximityLayerRef.current?.removeAll();
    analysisLayerRef.current?.removeAll();
    setProximity(null);
    setSelection(null);
    setPlannerFeature(null);
    setBufferResult(null);
    setConstraintChecks(null);
    onFeatureSelectRef.current?.(null);
  }, [clearSelectionToken]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !searchTerm.trim()) return;
    const value = searchTerm.trim().replace(/'/g, "''");
    const searchConfigs = mapLayers.filter(
      (config) =>
        (config.searchFields?.length && config.id === "parcels-landuse") ||
        config.id === "buildings" ||
        config.id === "buildings-parcels",
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
          const selected: PlannerFeatureSelection = {
            kind,
            layerId: config.id,
            layerTitle: config.title,
            geometry: graphic.geometry,
            attributes,
            context,
          };
          setPlannerFeature(selected);
          onFeatureSelectRef.current?.(selected);
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
  }, [mapLayers, searchTerm]);

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
    mapLayers.forEach((config) => {
      const layer = featureLayersRef.current[config.id];
      if (layer) {
        layer.visible = layerVisibility[config.id] ?? config.defaultVisible;
      }
    });
  }, [layerVisibility, mapLayers]);

  useEffect(() => {
    if (
      !enablePlannerTools ||
      mapStatus !== "ready" ||
      activePlannerTool !== "measurement" ||
      !measurementContainerRef.current ||
      !viewRef.current
    ) {
      return;
    }

    const measurement = new Measurement({
      view: viewRef.current,
      activeTool: measurementMode,
      areaUnit: "acres",
      linearUnit: "meters",
      container: measurementContainerRef.current,
    });
    measurementRef.current = measurement;

    return () => {
      measurement.destroy();
      measurementRef.current = null;
    };
  }, [activePlannerTool, enablePlannerTools, mapStatus]);

  useEffect(() => {
    if (measurementRef.current) {
      measurementRef.current.activeTool = measurementMode;
    }
  }, [measurementMode]);

  useEffect(() => {
    if (
      !enablePlannerTools ||
      mapStatus !== "ready" ||
      activePlannerTool !== "sketch" ||
      !sketchContainerRef.current ||
      !viewRef.current ||
      !sketchLayerRef.current
    ) {
      return;
    }

    const sketch = new Sketch({
      view: viewRef.current,
      layer: sketchLayerRef.current,
      availableCreateTools: ["polygon", "polyline"],
      container: sketchContainerRef.current,
    });
    sketchWidgetRef.current = sketch;

    return () => {
      sketch.destroy();
      sketchWidgetRef.current = null;
    };
  }, [activePlannerTool, enablePlannerTools, mapStatus]);

  useEffect(() => {
    analysisRunRef.current += 1;
    analysisLayerRef.current?.removeAll();
    setBufferLoading(false);
    setChecksLoading(false);
    setBufferResult(null);
    setConstraintChecks(null);
    setAnalysisMessage(null);
  }, [plannerFeature]);

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

  useEffect(() => {
    const view = viewRef.current;
    const layer = detectionsLayerRef.current;
    if (
      mapStatus !== "ready" ||
      !view ||
      !layer ||
      !selectedDetectionId
    ) {
      return;
    }

    let cancelled = false;
    const escapedId = selectedDetectionId.replace(/'/g, "''");
    (async () => {
      try {
        await Promise.all([view.when(), layer.load()]);
        if (cancelled) return;
        const result = await layer.queryFeatures({
          where: `id = '${escapedId}'`,
          returnGeometry: true,
          outFields: ["*"],
        }) as __esri.FeatureSet;
        if (cancelled || result.features.length === 0) return;
        const feature = result.features[0];
        if (!feature.geometry) return;
        const attrs = (feature.attributes ?? {}) as Record<string, unknown>;
        setPlannerFeature(null);
        const layerView = await view.whenLayerView(layer);
        if (cancelled) return;
        highlightHandleRef.current?.remove();
        highlightHandleRef.current = layerView.highlight(feature);
        setSelection({
          kind: "detection",
          id: selectedDetectionId,
          changeType: String(attrs.change_type ?? "UNKNOWN"),
          confidence: Number(attrs.confidence ?? 0),
        });
        onFeatureSelectRef.current?.({
          kind: "detection",
          layerId: "detections",
          layerTitle: "Observed spatial change",
          geometry: feature.geometry,
          attributes: attrs,
          detectionId: selectedDetectionId,
          changeType: String(attrs.change_type ?? "UNKNOWN"),
          confidence: Number(attrs.confidence ?? 0),
        });
        await view.goTo({ target: feature.geometry, zoom: 19 });
      } catch {
        // A missing or unavailable detection geometry leaves the map unchanged.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detectionsFC, mapStatus, selectedDetectionId]);

  const runParcelBuffer = async () => {
    if (plannerFeature?.kind !== "parcel") {
      setAnalysisMessage("Select a parcel on the map before running proximity analysis.");
      return;
    }

    const distanceMeters = Number(bufferDistance);
    if (!Number.isFinite(distanceMeters) || distanceMeters < 1 || distanceMeters > 5000) {
      setAnalysisMessage("Enter a distance from 1 to 5,000 metres.");
      return;
    }

    const parcelLayer = featureLayersRef.current["parcels-landuse"];
    const analysisLayer = analysisLayerRef.current;
    if (!parcelLayer || !analysisLayer) {
      setAnalysisMessage("Parcel data is unavailable in the current map.");
      return;
    }

    const requestId = ++analysisRunRef.current;
    setActivePlannerTool("buffer");
    setBufferLoading(true);
    setChecksLoading(false);
    setConstraintChecks(null);
    setAnalysisMessage(null);
    setBufferResult(null);
    analysisLayer.removeAll();

    try {
      const bufferGeometry = geometryEngine.geodesicBuffer(
        plannerFeature.geometry as __esri.Polygon,
        distanceMeters,
        "meters",
      );
      const objectIds: Array<string | number> = await parcelLayer.queryObjectIds({
        where: "1=1",
        geometry: bufferGeometry,
        spatialRelationship: "intersects",
      });
      if (requestId !== analysisRunRef.current || !viewRef.current) return;

      const objectIdField = parcelLayer.objectIdField;
      const selectedObjectId = objectIdField
        ? plannerFeature.attributes[objectIdField]
        : undefined;
      const nearbyIds = (objectIds ?? []).filter(
        (id: string | number) =>
          selectedObjectId == null || String(id) !== String(selectedObjectId),
      );
      const nearbyFeatures: __esri.Graphic[] = [];
      const outFields = [
        "parcel_num",
        "lr_number",
        ...(objectIdField ? [objectIdField] : []),
      ];
      for (let index = 0; index < nearbyIds.length; index += 500) {
        const result = await parcelLayer.queryFeatures({
          objectIds: nearbyIds.slice(index, index + 500),
          outFields,
          returnGeometry: true,
        });
        nearbyFeatures.push(...(result.features as __esri.Graphic[]));
      }
      if (requestId !== analysisRunRef.current || !viewRef.current) return;

      const parcelCandidates = nearbyFeatures.filter((feature) => {
        const featureObjectId = objectIdField
          ? feature.attributes?.[objectIdField]
          : undefined;
        if (selectedObjectId != null && featureObjectId != null) {
          return String(featureObjectId) !== String(selectedObjectId);
        }
        return !(
          feature.geometry &&
          geometryEngine.equals(feature.geometry, plannerFeature.geometry)
        );
      });

      const bufferGraphic = new Graphic({
        geometry: bufferGeometry,
        symbol: new SimpleFillSymbol({
          color: "rgba(47, 93, 70, 0.08)",
          outline: new SimpleLineSymbol({
            color: "#2F5D46",
            width: 1.5,
            style: "dash",
          }),
        }),
      });
      const neighborGraphics = parcelCandidates
        .filter((feature) => feature.geometry)
        .map(
          (feature) =>
            new Graphic({
              geometry: feature.geometry,
              attributes: feature.attributes,
              symbol: new SimpleFillSymbol({
                color: "rgba(190, 115, 48, 0.13)",
                outline: new SimpleLineSymbol({ color: "#A85B22", width: 1.6 }),
              }),
            }),
        );
      analysisLayer.removeAll();
      analysisLayer.addMany([bufferGraphic, ...neighborGraphics]);
      setBufferResult({ distanceMeters, features: parcelCandidates });
    } catch {
      if (requestId === analysisRunRef.current) {
        setAnalysisMessage("The parcel buffer could not be completed from the current layer service.");
      }
    } finally {
      if (requestId === analysisRunRef.current) setBufferLoading(false);
    }
  };

  const runConstraintChecks = async () => {
    if (plannerFeature?.kind !== "parcel") {
      setAnalysisMessage("Select a parcel on the map before running constraint checks.");
      return;
    }

    const checks = [
      { id: "river-buffer", title: "15 m river buffer" },
      { id: "flood-zones", title: "Flood zones" },
      { id: "wetlands", title: "Protected wetlands" },
      { id: "historic-districts", title: "Historic preservation districts" },
    ];
    const requestId = ++analysisRunRef.current;
    setActivePlannerTool("checks");
    setChecksLoading(true);
    setBufferLoading(false);
    setBufferResult(null);
    setAnalysisMessage(null);
    setConstraintChecks(null);
    analysisLayerRef.current?.removeAll();

    try {
      const results = await Promise.all(
        checks.map(async ({ id, title }) => {
          const layer = featureLayersRef.current[id];
          if (!layer) {
            return { check: { title, state: "unavailable" as const }, features: [] as __esri.Graphic[] };
          }

          try {
            const result = await layer.queryFeatures({
              where: "1=1",
              geometry: plannerFeature.geometry,
              spatialRelationship: "intersects",
              outFields: ["*"],
              returnGeometry: true,
            });
            const features = (result.features as __esri.Graphic[]).filter(
              (feature) =>
                feature.geometry &&
                geometryEngine.intersects(
                  plannerFeature.geometry,
                  feature.geometry,
                ),
            );
            return {
              check: {
                title,
                state: features.length ? ("intersects" as const) : ("clear" as const),
                count: features.length,
              },
              features,
            };
          } catch {
            return { check: { title, state: "error" as const }, features: [] as __esri.Graphic[] };
          }
        }),
      );

      if (requestId !== analysisRunRef.current || !viewRef.current) return;
      setConstraintChecks(results.map((result) => result.check));
      const hitGraphics = results.flatMap((result) => result.features).map(
        (feature) =>
          new Graphic({
            geometry: feature.geometry,
            attributes: feature.attributes,
            symbol: new SimpleFillSymbol({
              color: "rgba(170, 53, 42, 0.18)",
              outline: new SimpleLineSymbol({ color: "#AA352A", width: 2 }),
            }),
          }),
      );
      analysisLayerRef.current?.removeAll();
      analysisLayerRef.current?.addMany(hitGraphics);
    } finally {
      if (requestId === analysisRunRef.current) setChecksLoading(false);
    }
  };

  const clearSelection = () => {
    highlightHandleRef.current?.remove();
    highlightHandleRef.current = null;
    proximityLayerRef.current?.removeAll();
    setProximity(null);
    setSelection(null);
    setPlannerFeature(null);
    onFeatureSelectRef.current?.(null);
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
      className={`relative h-full min-h-[360px] overflow-hidden ${className ?? ""}`}
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
            className="pointer-events-auto absolute left-4 top-4 z-20 flex w-[min(28rem,calc(100%-2rem))] gap-2"
          >
            <calcite-input
              value={searchValue}
              onInput={(event) =>
                setSearchValue((event.target as HTMLInputElement).value)
              }
              placeholder="Search parcel or building"
              aria-label="Search parcel or building"
              icon-start="search"
              scale="s"
              className="min-w-0 flex-1"
            />
            <calcite-button
              type="submit"
              appearance="outline"
              scale="s"
              icon-start="search"
              label="Search parcel or building"
            ></calcite-button>
          </form>
          {searchMessage && (
            <calcite-notice
              open
              scale="s"
              className="pointer-events-none absolute left-4 top-16 z-20"
              kind="danger"
            >
              {searchMessage}
            </calcite-notice>
          )}
          {enablePlannerTools && (
            <div className="pointer-events-none absolute right-4 top-24 z-30 flex flex-col items-end gap-2">
              <calcite-button
                className="pointer-events-auto"
                appearance={plannerToolsOpen ? "solid" : "outline"}
                scale="m"
                icon-start="analysis"
                label="Planning tools"
                aria-label="Planning tools"
                aria-expanded={plannerToolsOpen}
                aria-controls="planner-tools-panel"
                title="Planning tools"
                onClick={() => {
                  if (plannerToolsOpen) setActivePlannerTool(null);
                  setPlannerToolsOpen(!plannerToolsOpen);
                }}
              />
              {plannerToolsOpen && (
                <calcite-panel
                  id="planner-tools-panel"
                  heading="Planning tools"
                  description="Temporary, client-side map analysis"
                  className="pointer-events-auto max-h-[min(72vh,44rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto"
                >
                  <calcite-button
                    slot="header-actions-end"
                    appearance="transparent"
                    icon-start="x"
                    label="Close planning tools"
                    onClick={() => {
                      setPlannerToolsOpen(false);
                      setActivePlannerTool(null);
                    }}
                  />

                  <calcite-block heading="Measure" open>
                    <p className="mb-2 text-sm">
                      Measure map distance in metres or area in acres.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <calcite-button
                        appearance={
                          activePlannerTool === "measurement" &&
                          measurementMode === "distance"
                            ? "solid"
                            : "outline"
                        }
                        scale="s"
                        icon-start="measure"
                        onClick={() => {
                          setMeasurementMode("distance");
                          setActivePlannerTool("measurement");
                        }}
                      >
                        Distance
                      </calcite-button>
                      <calcite-button
                        appearance={
                          activePlannerTool === "measurement" &&
                          measurementMode === "area"
                            ? "solid"
                            : "outline"
                        }
                        scale="s"
                        icon-start="measure-area"
                        onClick={() => {
                          setMeasurementMode("area");
                          setActivePlannerTool("measurement");
                        }}
                      >
                        Area
                      </calcite-button>
                    </div>
                    {activePlannerTool === "measurement" && (
                      <div className="mt-2">
                        <div
                          ref={measurementContainerRef}
                          className="min-h-24"
                        />
                        <calcite-button
                          appearance="transparent"
                          scale="s"
                          onClick={() => measurementRef.current?.clear()}
                        >
                          Clear measurement
                        </calcite-button>
                      </div>
                    )}
                  </calcite-block>

                  <calcite-block heading="Site sketch" open>
                    <p className="mb-2 text-sm">
                      Draw temporary footprint polygons or access routes on the map.
                    </p>
                    <calcite-button
                      appearance={activePlannerTool === "sketch" ? "solid" : "outline"}
                      scale="s"
                      icon-start="pencil"
                      onClick={() => setActivePlannerTool("sketch")}
                    >
                      Open sketch tools
                    </calcite-button>
                    {activePlannerTool === "sketch" && (
                      <div ref={sketchContainerRef} className="mt-2" />
                    )}
                    <calcite-button
                      appearance="transparent"
                      scale="s"
                      className="mt-1"
                      onClick={() => sketchLayerRef.current?.removeAll()}
                    >
                      Clear all sketches
                    </calcite-button>
                  </calcite-block>

                  <calcite-block heading="Proximity buffer" open>
                    <p className="mb-2 text-sm">
                      Highlight mapped parcels within a distance of the selected parcel.
                    </p>
                    <div className="flex items-end gap-2">
                      <calcite-input
                        type="number"
                        min="1"
                        max="5000"
                        step="50"
                        value={bufferDistance}
                        label="Buffer distance in metres"
                        onInput={(event) =>
                          setBufferDistance(
                            (event.target as HTMLInputElement).value,
                          )
                        }
                        className="min-w-0 flex-1"
                      />
                      <calcite-button
                        appearance="solid"
                        scale="s"
                        icon-start="rings"
                        disabled={
                          bufferLoading || plannerFeature?.kind !== "parcel"
                        }
                        onClick={runParcelBuffer}
                      >
                        {bufferLoading ? "Checking" : "Run buffer"}
                      </calcite-button>
                    </div>
                    {plannerFeature?.kind !== "parcel" && (
                      <p className="mt-2 text-sm">
                        Select a parcel on the map to run this analysis.
                      </p>
                    )}
                    {bufferLoading && (
                      <calcite-loader label="Finding surrounding parcels" />
                    )}
                    {bufferResult && (
                      <div className="mt-2">
                        <p className="mb-2 text-sm">
                          {bufferResult.features.length} mapped parcel
                          {bufferResult.features.length === 1 ? "" : "s"} within{" "}
                          {bufferResult.distanceMeters} m. All returned parcels are
                          highlighted on the map for notification review.
                        </p>
                        <calcite-notice open kind="warning" scale="s">
                          This is a proximity screen. Confirm the applicable
                          notification rules before using it as a legal notice list.
                        </calcite-notice>
                        <calcite-list label="Nearby parcel candidates" className="mt-2">
                          {bufferResult.features.slice(0, 25).map((feature, index) => {
                            const parcelReference =
                              feature.attributes?.parcel_num ??
                              feature.attributes?.lr_number;
                            return (
                              <calcite-list-item
                                key={String(
                                  feature.attributes?.OBJECTID ?? index,
                                )}
                                label={
                                  parcelReference == null || parcelReference === ""
                                    ? "Parcel reference unavailable"
                                    : String(parcelReference)
                                }
                              />
                            );
                          })}
                        </calcite-list>
                        {bufferResult.features.length > 25 && (
                          <p className="mt-1 text-xs">
                            Showing 25 of {bufferResult.features.length} returned
                            parcels; all are highlighted on the map.
                          </p>
                        )}
                      </div>
                    )}
                  </calcite-block>

                  <calcite-block heading="Environmental checks" open>
                    <p className="mb-2 text-sm">
                      Check the selected parcel against available mapped constraints.
                    </p>
                    <calcite-button
                      appearance="outline"
                      scale="s"
                      icon-start="check-square"
                      disabled={
                        checksLoading || plannerFeature?.kind !== "parcel"
                      }
                      onClick={runConstraintChecks}
                    >
                      {checksLoading ? "Checking layers" : "Check constraints"}
                    </calcite-button>
                    {checksLoading && (
                      <calcite-loader label="Checking constraint layers" />
                    )}
                    {constraintChecks && (
                      <calcite-list label="Environmental and planning constraints" className="mt-2">
                        {constraintChecks.map((check) => {
                          const description =
                            check.state === "intersects"
                              ? `Potential overlap in ${check.count} mapped feature${check.count === 1 ? "" : "s"}`
                              : check.state === "clear"
                                ? "No overlap returned from the available layer"
                                : check.state === "unavailable"
                                  ? "Layer unavailable in this map"
                                  : "Layer query failed; result is unknown";
                          return (
                            <calcite-list-item
                              key={check.title}
                              label={check.title}
                              description={description}
                            />
                          );
                        })}
                      </calcite-list>
                    )}
                    {constraintChecks && (
                      <calcite-notice open kind="warning" scale="s" className="mt-2">
                        A detected overlap requires source and planning review.
                        Flood, wetland, and historic layers are not configured in
                        this map, so their status remains unknown.
                      </calcite-notice>
                    )}
                  </calcite-block>

                  {analysisMessage && (
                    <calcite-notice open kind="danger" scale="s">
                      {analysisMessage}
                    </calcite-notice>
                  )}
                </calcite-panel>
              )}
            </div>
          )}
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
    </div>
  );
}
