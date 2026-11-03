import Point from '@arcgis/core/geometry/Point';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';

export interface SiteProximity {
  roadDistanceM: number | null;
  inSeweredArea: boolean;
  nearPowerLine: boolean;
}

const ROAD_SEARCH_M = 500;
const POWER_NEAR_M = 80;

export async function analyzeSiteProximity(
  lat: number,
  lon: number,
  roadsLayer: FeatureLayer,
  sewerLayer?: FeatureLayer,
  powerLayer?: FeatureLayer,
): Promise<SiteProximity> {
  const point = new Point({ longitude: lon, latitude: lat });

  let roadDistanceM: number | null = null;
  try {
    const roads = await roadsLayer.queryFeatures({
      geometry: point,
      distance: ROAD_SEARCH_M,
      units: 'meters',
      spatialRelationship: 'intersects',
      returnGeometry: true,
      outFields: ['OBJECTID'],
    });
    for (const feature of roads.features) {
      if (!feature.geometry) continue;
      const distance = geometryEngine.distance(point, feature.geometry, 'meters');
      if (roadDistanceM == null || distance < roadDistanceM) {
        roadDistanceM = distance;
      }
    }
    if (roadDistanceM != null) roadDistanceM = Math.round(roadDistanceM);
  } catch {
    /* layer may still be loading */
  }

  let inSeweredArea = false;
  if (sewerLayer) {
    try {
      const sewered = await sewerLayer.queryFeatures({
        geometry: point,
        spatialRelationship: 'intersects',
        returnGeometry: false,
        outFields: ['OBJECTID'],
      });
      inSeweredArea = sewered.features.length > 0;
    } catch {
      /* ignore */
    }
  }

  let nearPowerLine = false;
  if (powerLayer) {
    try {
      const power = await powerLayer.queryFeatures({
        geometry: point,
        distance: POWER_NEAR_M,
        units: 'meters',
        spatialRelationship: 'intersects',
        returnGeometry: false,
        outFields: ['OBJECTID'],
      });
      nearPowerLine = power.features.length > 0;
    } catch {
      /* ignore */
    }
  }

  return { roadDistanceM, inSeweredArea, nearPowerLine };
}

export function formatRoadProximity(distanceM: number | null): string {
  if (distanceM == null) return 'No road within 500 m';
  if (distanceM <= 15) return `${distanceM} m from road — frontage likely`;
  if (distanceM <= 50) return `${distanceM} m from nearest road`;
  return `${distanceM} m from nearest road — setback check`;
}
