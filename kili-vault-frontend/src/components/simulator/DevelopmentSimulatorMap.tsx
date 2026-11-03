import { useEffect, useRef, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { KILIMANI_WARD_EXTENT, MAP_LAYERS } from "@/config/mapLayers";
import { createMapFeatureLayer } from "@/lib/mapFeatureLayer";
import {
  areaM2,
  attributeValue,
  type SiteContext,
} from "@/lib/developmentSimulator";
import { MapSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/cn";

interface DevelopmentSimulatorMapProps {
  proposedGeometry: Geometry | null;
  mitigatedGeometry: Geometry | null;
  onSiteSelected: (site: SiteContext) => void;
  initialParcelRef?: string | null;
  className?: string;
}

const CONTEXT_LAYER_IDS = [
  "kilimani-ward",
  "parcels-landuse",
  "landuse",
  "buildings",
  "roads",
  "rivers",
  "river-buffer",
] as const;

function scenarioSymbol(fill: string, outline: string) {
  return {
    type: "simple-fill" as const,
    color: fill,
    outline: { type: "simple-line" as const, color: outline, width: 2 },
  };
}

async function loadSiteContext(
  graphic: __esri.Graphic,
  layers: Record<string, FeatureLayer>,
): Promise<SiteContext | null> {
  const parcelGeometry = graphic.geometry;
  if (!parcelGeometry) return null;
  const parcelAreaM2 = areaM2(parcelGeometry);
  const parcelIdValue = attributeValue(graphic.attributes ?? {}, [
    "parcel_num",
    "lr_number",
    "fr_number",
    "old_parcel",
    "dp_number",
    "TARGET_FID",
    "FID",
  ]);
  const landUseValue = attributeValue(graphic.attributes ?? {}, [
    "LANDUSE",
    "landuse",
    "GENERAL_DE",
    "NAME",
  ]);
  const buildings = await queryIntersecting(layers.buildings, parcelGeometry);
  const existingBuildingGeometry = buildings
    .map((item) => item.geometry)
    .filter((item): item is Geometry => Boolean(item));
  const existingBuildingAreaM2 = existingBuildingGeometry.reduce(
    (sum, building) => {
      return sum + areaM2(geometryEngine.intersect(parcelGeometry, building));
    },
    0,
  );
  const searchGeometry = geometryEngine.geodesicBuffer(
    parcelGeometry,
    500,
    "meters",
  );
  const [roads, rivers, buffers] = await Promise.all([
    queryIntersecting(layers.roads, searchGeometry),
    queryIntersecting(layers.rivers, searchGeometry),
    queryIntersecting(layers["river-buffer"], parcelGeometry),
  ]);
  const nearestDistance = (items: any[]) => {
    const distances = items
      .map((item) =>
        item.geometry
          ? geometryEngine.distance(parcelGeometry, item.geometry, "meters")
          : null,
      )
      .filter(
        (distance): distance is number =>
          distance != null && Number.isFinite(distance),
      );
    return distances.length ? Math.min(...distances) : null;
  };
  return {
    parcelId: parcelIdValue == null ? null : String(parcelIdValue),
    landUse: landUseValue == null ? null : String(landUseValue),
    parcelAreaM2,
    parcelGeometry,
    existingBuildingGeometry,
    existingBuildingAreaM2,
    existingBuildingCount: existingBuildingGeometry.length,
    roadDistanceM: nearestDistance(roads),
    riverDistanceM: nearestDistance(rivers),
    riverBufferOverlap: buffers.length > 0,
    riverBufferGeometries: buffers
      .map((item) => item.geometry)
      .filter((item): item is Geometry => Boolean(item)),
  };
}

export function DevelopmentSimulatorMap({
  proposedGeometry,
  mitigatedGeometry,
  onSiteSelected,
  initialParcelRef,
  className,
}: DevelopmentSimulatorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const layersRef = useRef<Record<string, FeatureLayer>>({});
  const selectedLayerRef = useRef<GraphicsLayer | null>(null);
  const scenarioLayerRef = useRef<GraphicsLayer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "Select a parcel to establish the existing condition.",
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    const map = new Map({ basemap: "arcgis-topographic" });
    const layers: Record<string, FeatureLayer> = {};
    CONTEXT_LAYER_IDS.forEach((id) => {
      const config = MAP_LAYERS.find((item) => item.id === id);
      if (!config) return;
      const layer = createMapFeatureLayer(config, config.defaultVisible);
      layers[id] = layer;
      map.add(layer);
    });

    const selectedLayer = new GraphicsLayer({ title: "Selected parcel" });
    const scenarioLayer = new GraphicsLayer({ title: "Scenario footprints" });
    map.add(selectedLayer);
    map.add(scenarioLayer);
    selectedLayerRef.current = selectedLayer;
    scenarioLayerRef.current = scenarioLayer;
    layersRef.current = layers;

    const view = new MapView({
      container: containerRef.current,
      map,
      extent: KILIMANI_WARD_EXTENT,
      constraints: { geometry: KILIMANI_WARD_EXTENT, minScale: 500000 },
      popup: {
        dockEnabled: true,
        dockOptions: { position: "bottom-right", breakpoint: false },
      },
    });
    viewRef.current = view;

    view
      .when(() => {
        if (!destroyed) setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (!destroyed) {
          setStatus("error");
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to initialize the planning map.",
          );
        }
      });

    const clickHandle = view.on(
      "click",
      async (event: __esri.ViewClickEvent) => {
        const parcelLayer = layers["parcels-landuse"];
        if (!parcelLayer) return;
        setMessage("Loading parcel and surrounding planning context...");
        try {
          const hit = await view.hitTest(event, { include: parcelLayer });
          const graphic = hit.results.find(
            (result: any) => result.type === "graphic",
          ) as __esri.GraphicHit | undefined;
          if (!graphic?.graphic.geometry) {
            setMessage(
              "No parcel found at that location. Select a parcel polygon and try again.",
            );
            return;
          }
          const parcelGeometry = graphic.graphic.geometry;
          const parcelAreaM2 = areaM2(parcelGeometry);
          const parcelIdValue = attributeValue(
            graphic.graphic.attributes ?? {},
            [
              "parcel_num",
              "lr_number",
              "fr_number",
              "old_parcel",
              "dp_number",
              "TARGET_FID",
              "FID",
            ],
          );
          const landUseValue = attributeValue(
            graphic.graphic.attributes ?? {},
            ["LANDUSE", "landuse", "GENERAL_DE", "NAME"],
          );
          const buildings = await queryIntersecting(
            layers.buildings,
            parcelGeometry,
          );
          const existingBuildingGeometry = buildings
            .map((item) => item.geometry)
            .filter((item): item is Geometry => Boolean(item));
          const existingBuildingAreaM2 = existingBuildingGeometry.reduce(
            (sum, building) => {
              const intersection = geometryEngine.intersect(
                parcelGeometry,
                building,
              );
              return sum + areaM2(intersection);
            },
            0,
          );
          const searchGeometry = geometryEngine.geodesicBuffer(
            parcelGeometry,
            500,
            "meters",
          );
          const [roads, rivers, buffers] = await Promise.all([
            queryIntersecting(layers.roads, searchGeometry),
            queryIntersecting(layers.rivers, searchGeometry),
            queryIntersecting(layers["river-buffer"], parcelGeometry),
          ]);
          const nearestDistance = (items: any[]) => {
            const distances = items
              .map((item) =>
                item.geometry
                  ? geometryEngine.distance(
                      parcelGeometry,
                      item.geometry,
                      "meters",
                    )
                  : null,
              )
              .filter(
                (distance): distance is number =>
                  distance != null && Number.isFinite(distance),
              );
            return distances.length ? Math.min(...distances) : null;
          };
          const site: SiteContext = {
            parcelId: parcelIdValue == null ? null : String(parcelIdValue),
            landUse: landUseValue == null ? null : String(landUseValue),
            parcelAreaM2,
            parcelGeometry,
            existingBuildingGeometry,
            existingBuildingAreaM2,
            existingBuildingCount: existingBuildingGeometry.length,
            roadDistanceM: nearestDistance(roads),
            riverDistanceM: nearestDistance(rivers),
            riverBufferOverlap: buffers.length ? true : false,
            riverBufferGeometries: buffers
              .map((item) => item.geometry)
              .filter((item): item is Geometry => Boolean(item)),
          };
          selectedLayer.removeAll();
          selectedLayer.add(
            new Graphic({
              geometry: parcelGeometry,
              symbol: scenarioSymbol("rgba(196, 120, 90, 0.12)", "#C4785A"),
            }),
          );
          setMessage("Parcel selected. Enter a proposal to compare scenarios.");
          onSiteSelected(site);
          view
            .goTo({
              target: parcelGeometry,
              padding: { top: 80, right: 40, bottom: 80, left: 40 },
            })
            .catch(() => undefined);
        } catch (reason) {
          setMessage(
            "Unable to load parcel information. Please try another parcel.",
          );
          setError(
            reason instanceof Error ? reason.message : "Parcel query failed.",
          );
        }
      },
    );

    return () => {
      destroyed = true;
      clickHandle.remove();
      view.destroy();
      viewRef.current = null;
      layersRef.current = {};
      selectedLayerRef.current = null;
      scenarioLayerRef.current = null;
    };
  }, [onSiteSelected]);

  useEffect(() => {
    const view = viewRef.current;
    const parcelLayer = layersRef.current["parcels-landuse"];
    if (!view || !parcelLayer || !initialParcelRef?.trim()) return;
    let cancelled = false;
    const escaped = initialParcelRef.trim().replace(/'/g, "''");
    const fields = [
      "parcel_num",
      "lr_number",
      "fr_number",
      "old_parcel",
      "dp_number",
    ];
    const where = fields.map((field) => `${field} = '${escaped}'`).join(" OR ");
    setMessage("Restoring the parcel selected on the Planner map...");
    parcelLayer
      .queryFeatures({ where, returnGeometry: true, outFields: ["*"] })
      .then(async (result: __esri.FeatureSet) => {
        const graphic = result.features[0] as __esri.Graphic | undefined;
        if (!graphic || cancelled) {
          setMessage(
            "The selected parcel could not be found. Select a parcel on this map to continue.",
          );
          return;
        }
        const site = await loadSiteContext(graphic, layersRef.current);
        if (!site || cancelled) return;
        selectedLayerRef.current?.removeAll();
        selectedLayerRef.current?.add(
          new Graphic({
            geometry: site.parcelGeometry,
            symbol: scenarioSymbol("rgba(196, 120, 90, 0.12)", "#C4785A"),
          }),
        );
        onSiteSelected(site);
        setMessage(
          "Parcel restored from the Planner map. Enter a proposal to compare scenarios.",
        );
        view
          .goTo({
            target: site.parcelGeometry,
            padding: { top: 80, right: 40, bottom: 80, left: 40 },
          })
          .catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled)
          setMessage(
            "Unable to restore the selected parcel. Select a parcel on this map to continue.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [initialParcelRef, onSiteSelected]);

  useEffect(() => {
    const layer = scenarioLayerRef.current;
    if (!layer) return;
    layer.removeAll();
    if (proposedGeometry) {
      layer.add(
        new Graphic({
          geometry: proposedGeometry,
          symbol: scenarioSymbol("rgba(196, 120, 90, 0.35)", "#A86145"),
          attributes: { scenario: "Proposed development" },
        }),
      );
    }
    if (mitigatedGeometry) {
      layer.add(
        new Graphic({
          geometry: mitigatedGeometry,
          symbol: scenarioSymbol("rgba(42, 77, 56, 0.3)", "#2A4D38"),
          attributes: { scenario: "Mitigated scenario" },
        }),
      );
    }
  }, [mitigatedGeometry, proposedGeometry]);

  if (status === "error") {
    return (
      <ErrorState
        title="Planning map failed to load"
        message={error ?? "Unable to connect to ArcGIS FeatureServer layers."}
        variant="network"
        className={className}
      />
    );
  }
  return (
    <div
      className={cn(
        "relative min-h-[460px] overflow-hidden rounded-2xl border border-sand",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {status === "loading" && (
        <div className="absolute inset-0 z-10">
          <MapSkeleton />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-off-white/90 to-transparent p-4">
        <p className="inline-flex rounded-full border border-off-white/70 bg-off-white/90 px-3 py-1.5 text-xs font-semibold text-forest shadow-soft">
          {message}
        </p>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-full border border-clay/40 bg-off-white/90 px-3 py-1.5 text-clay-dark">
          Proposed
        </span>
        <span className="rounded-full border border-forest/40 bg-off-white/90 px-3 py-1.5 text-forest">
          Mitigated
        </span>
      </div>
    </div>
  );
}

async function queryIntersecting(
  layer: FeatureLayer | undefined,
  geometry: Geometry | null,
): Promise<any[]> {
  if (!layer || !geometry) return [];
  const result = await layer.queryFeatures({
    where: "1=1",
    geometry,
    spatialRelationship: "intersects",
    returnGeometry: true,
    outFields: ["*"],
  });
  return result.features;
}
