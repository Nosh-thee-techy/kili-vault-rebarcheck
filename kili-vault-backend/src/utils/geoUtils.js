/**
 * Kili-Vault Backend: Geospatial Utility Module
 * Validates, transforms, and calculates properties for GeoJSON and PostGIS features.
 */
'use strict';

/**
 * Validates whether an array is a valid WGS84 bounding box [minLon, minLat, maxLon, maxLat].
 */
function isValidBbox(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return false;
  const [minLon, minLat, maxLon, maxLat] = bbox.map(Number);
  if (isNaN(minLon) || isNaN(minLat) || isNaN(maxLon) || isNaN(maxLat)) return false;
  if (minLon < -180 || minLon > 180 || maxLon < -180 || maxLon > 180) return false;
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) return false;
  return minLon <= maxLon && minLat <= maxLat;
}

/**
 * Parses a comma-separated bbox string 'minLon,minLat,maxLon,maxLat' into an array of numbers.
 */
function parseBboxString(bboxStr) {
  if (!bboxStr) return null;
  const parts = bboxStr.split(',').map(s => parseFloat(s.trim()));
  if (!isValidBbox(parts)) {
    throw new Error('Invalid bbox format. Expected: minLon,minLat,maxLon,maxLat');
  }
  return parts;
}

function getCoordinatesRing(input) {
  if (!input) return null;
  if (input.type === 'Polygon' && Array.isArray(input.coordinates)) {
    return input.coordinates[0];
  }
  if (Array.isArray(input)) {
    if (Array.isArray(input[0]) && Array.isArray(input[0][0])) {
      return input[0];
    }
    return input;
  }
  return null;
}

/**
 * Calculates the centroid of a GeoJSON Polygon coordinates ring.
 * Accepts either a Polygon geometry object or coordinates array.
 */
function calculateCentroid(input) {
  const ring = getCoordinatesRing(input);
  if (!ring || ring.length === 0) {
    throw new Error('Cannot calculate centroid of empty coordinates');
  }

  // If closed ring (first equals last), exclude closing vertex from centroid calculation
  let points = ring;
  if (ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) {
    points = ring.slice(0, -1);
  }

  let sumLon = 0;
  let sumLat = 0;
  const count = points.length;

  for (let i = 0; i < count; i++) {
    sumLon += points[i][0];
    sumLat += points[i][1];
  }

  const lon = parseFloat((sumLon / count).toFixed(6));
  const lat = parseFloat((sumLat / count).toFixed(6));

  const result = [lon, lat];
  result.type = 'Point';
  result.coordinates = [lon, lat];
  return result;
}

/**
 * Calculates approximate area in square meters for a WGS84 polygon using geodesics approximation.
 * Appropriate for local Kilimani Ward scale (latitude ~ -1.29 degrees).
 */
function calculateApproxAreaM2(input) {
  const ring = getCoordinatesRing(input);
  if (!ring || ring.length < 3) return 0;

  const EARTH_RADIUS = 6378137; // WGS84 major axis in meters
  let area = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i];
    const p2 = ring[i + 1];

    const lon1 = (p1[0] * Math.PI) / 180;
    const lat1 = (p1[1] * Math.PI) / 180;
    const lon2 = (p2[0] * Math.PI) / 180;
    const lat2 = (p2[1] * Math.PI) / 180;

    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = (Math.abs(area) * EARTH_RADIUS * EARTH_RADIUS) / 2.0;
  return parseFloat(area.toFixed(2));
}

/**
 * Calculates bounding box [minLon, minLat, maxLon, maxLat] from polygon or coordinates.
 */
function calculateBbox(input) {
  const ring = getCoordinatesRing(input);
  if (!ring || ring.length === 0) return [0, 0, 0, 0];

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;

  for (const pt of ring) {
    if (pt[0] < minLon) minLon = pt[0];
    if (pt[0] > maxLon) maxLon = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  }

  return [
    parseFloat(minLon.toFixed(6)),
    parseFloat(minLat.toFixed(6)),
    parseFloat(maxLon.toFixed(6)),
    parseFloat(maxLat.toFixed(6))
  ];
}

/**
 * Formats a list of database detection or case records into a standard GeoJSON FeatureCollection.
 * Consumable directly by external ArcGIS Maps SDK or Leaflet/MapLibre.
 */
function toFeatureCollection(records, geometryKey = 'geometry', idKey = 'id') {
  const features = records.map((record) => {
    let geom = record[geometryKey];
    if (typeof geom === 'string') {
      try {
        geom = JSON.parse(geom);
      } catch {
        geom = null;
      }
    }

    const properties = { ...record };
    delete properties[geometryKey];

    return {
      type: 'Feature',
      id: record[idKey],
      geometry: geom,
      properties,
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

module.exports = {
  isValidBbox,
  parseBboxString,
  calculateCentroid,
  calculateApproxAreaM2,
  approximatePolygonAreaM2: calculateApproxAreaM2,
  calculateBbox,
  toFeatureCollection,
};
