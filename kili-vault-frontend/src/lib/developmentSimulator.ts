import Polygon from "@arcgis/core/geometry/Polygon";
import type Geometry from "@arcgis/core/geometry/Geometry";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

export interface SiteContext {
  parcelId: string | null;
  landUse: string | null;
  parcelAreaM2: number;
  parcelGeometry: Geometry;
  existingBuildingGeometry: Geometry[];
  existingBuildingAreaM2: number;
  existingBuildingCount: number;
  roadDistanceM: number | null;
  riverDistanceM: number | null;
  riverBufferOverlap: boolean | null;
  riverBufferGeometries: Geometry[];
}

export interface ScenarioInputs {
  footprintAreaM2: number;
  floors: number;
  units: number;
  occupancyPerUnit: number;
  stormwaterManagement: boolean;
}

export interface ScenarioMetrics {
  builtUpAreaM2: number;
  builtUpSharePercent: number | null;
  openSurfaceM2: number | null;
  floorAreaM2: number;
  estimatedOccupancy: number | null;
  riverBufferOverlap: boolean | null;
}

export function areaM2(geometry: Geometry | null | undefined): number {
  if (!geometry) return 0;
  const area = geometryEngine.geodesicArea(
    geometry as __esri.Polygon,
    "square-meters",
  );
  return Number.isFinite(area) && area > 0 ? area : 0;
}

export function calculateMetrics(
  parcelAreaM2: number,
  inputs: ScenarioInputs,
  riverBufferOverlap: boolean | null,
): ScenarioMetrics {
  const footprint = Math.max(0, inputs.footprintAreaM2);
  return {
    builtUpAreaM2: footprint,
    builtUpSharePercent:
      parcelAreaM2 > 0 ? (footprint / parcelAreaM2) * 100 : null,
    openSurfaceM2:
      parcelAreaM2 > 0 ? Math.max(0, parcelAreaM2 - footprint) : null,
    floorAreaM2: footprint * Math.max(0, inputs.floors),
    estimatedOccupancy:
      inputs.units > 0 && inputs.occupancyPerUnit > 0
        ? inputs.units * inputs.occupancyPerUnit
        : null,
    riverBufferOverlap,
  };
}

export function scenarioRectangle(
  parcelGeometry: Geometry,
  requestedAreaM2: number,
): Polygon | null {
  const extent = parcelGeometry.extent;
  if (!extent || requestedAreaM2 <= 0) return null;

  const parcelArea = areaM2(parcelGeometry);
  const targetArea = Math.min(
    requestedAreaM2,
    parcelArea > 0 ? parcelArea * 0.98 : requestedAreaM2,
  );
  const aspect = Math.max(
    0.25,
    Math.min(4, extent.width / Math.max(extent.height, 1)),
  );
  const width = Math.sqrt(targetArea * aspect);
  const height = targetArea / width;
  const centerX = (extent.xmin + extent.xmax) / 2;
  const centerY = (extent.ymin + extent.ymax) / 2;

  return new Polygon({
    rings: [
      [
        [centerX - width / 2, centerY - height / 2],
        [centerX + width / 2, centerY - height / 2],
        [centerX + width / 2, centerY + height / 2],
        [centerX - width / 2, centerY + height / 2],
        [centerX - width / 2, centerY - height / 2],
      ],
    ],
    spatialReference: extent.spatialReference,
  });
}

export function attributeValue(
  attributes: Record<string, unknown>,
  candidates: string[],
): string | number | null {
  const keys = Object.keys(attributes);
  const key = keys.find((candidate) =>
    candidates.some((name) => name.toLowerCase() === candidate.toLowerCase()),
  );
  const value = key ? attributes[key] : null;
  return typeof value === "string" || typeof value === "number" ? value : null;
}
