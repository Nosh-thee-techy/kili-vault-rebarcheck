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

  const [roads, sewered, power] = await Promise.all([
    roadsLayer
      .queryFeatures({
        geometry: point,
        distance: ROAD_SEARCH_M,
        units: 'meters',
        spatialRelationship: 'intersects',
        returnGeometry: true,
        outFields: ['OBJECTID'],
      })
      .catch(() => null),
    sewerLayer
      ? sewerLayer
          .queryFeatures({
            geometry: point,
            spatialRelationship: 'intersects',
            returnGeometry: false,
            outFields: ['OBJECTID'],
          })
          .catch(() => null)
      : Promise.resolve(null),
    powerLayer
      ? powerLayer
          .queryFeatures({
            geometry: point,
            distance: POWER_NEAR_M,
            units: 'meters',
            spatialRelationship: 'intersects',
            returnGeometry: false,
            outFields: ['OBJECTID'],
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  let roadDistanceM: number | null = null;
  for (const feature of roads?.features ?? []) {
    if (!feature.geometry) continue;
    const distance = geometryEngine.distance(point, feature.geometry, 'meters');
    if (roadDistanceM == null || distance < roadDistanceM) {
      roadDistanceM = distance;
    }
  }
  if (roadDistanceM != null) roadDistanceM = Math.round(roadDistanceM);

  return {
    roadDistanceM,
    inSeweredArea: (sewered?.features.length ?? 0) > 0,
    nearPowerLine: (power?.features.length ?? 0) > 0,
  };
}

export function formatRoadProximity(distanceM: number | null): string {
  if (distanceM == null) return 'No road within 500 m';
  if (distanceM <= 15) return `${distanceM} m from road — frontage likely`;
  if (distanceM <= 50) return `${distanceM} m from nearest road`;
  return `${distanceM} m from nearest road — setback check`;
}
