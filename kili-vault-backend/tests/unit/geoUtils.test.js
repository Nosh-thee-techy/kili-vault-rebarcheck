/**
 * Unit Tests: Geospatial Utilities & Deduplication
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateCentroid,
  calculateBbox,
  approximatePolygonAreaM2,
  toFeatureCollection,
  isValidBbox,
} = require('../../src/utils/geoUtils');
const { generateDeduplicationHash } = require('../../src/utils/deduplicator');

test('geoUtils - calculateCentroid calculates correct center coordinate', () => {
  const polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [36.78, -1.29],
        [36.80, -1.29],
        [36.80, -1.31],
        [36.78, -1.31],
        [36.78, -1.29],
      ]
    ]
  };

  const centroid = calculateCentroid(polygon);
  assert.equal(centroid.type, 'Point');
  assert.equal(centroid.coordinates[0], 36.79);
  assert.equal(centroid.coordinates[1], -1.30);
});

test('geoUtils - calculateBbox returns [minX, minY, maxX, maxY]', () => {
  const polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [36.75, -1.30],
        [36.85, -1.28],
        [36.82, -1.32],
        [36.75, -1.30],
      ]
    ]
  };

  const bbox = calculateBbox(polygon);
  assert.equal(bbox.length, 4);
  assert.equal(bbox[0], 36.75); // minX
  assert.equal(bbox[1], -1.32); // minY
  assert.equal(bbox[2], 36.85); // maxX
  assert.equal(bbox[3], -1.28); // maxY
});

test('geoUtils - approximatePolygonAreaM2 returns non-zero positive area', () => {
  const polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [36.7820, -1.2915],
        [36.7830, -1.2915],
        [36.7830, -1.2925],
        [36.7820, -1.2925],
        [36.7820, -1.2915],
      ]
    ]
  };

  const area = approximatePolygonAreaM2(polygon);
  assert.ok(area > 0, 'Area should be positive');
  assert.ok(area > 5000 && area < 20000, `Area calculated (${area}) should be around ~12,000 m2`);
});

test('geoUtils - isValidBbox validates coordinate boundaries', () => {
  assert.equal(isValidBbox([36.7, -1.3, 36.8, -1.2]), true);
  assert.equal(isValidBbox([36.8, -1.2, 36.7, -1.3]), false); // inverted
  assert.equal(isValidBbox('invalid'), false);
  assert.equal(isValidBbox([1, 2, 3]), false);
});

test('deduplicator - generateDeduplicationHash produces identical hash for proximate points', () => {
  // Coordinates rounded to 4 decimals (~11m spatial tolerance)
  const hash1 = generateDeduplicationHash(36.78211, -1.29151, '2025-01-01', '2026-06-30');
  const hash2 = generateDeduplicationHash(36.78214, -1.29154, '2025-01-01', '2026-06-30');
  assert.equal(hash1, hash2);

  // Different coordinate should produce different hash
  const hash3 = generateDeduplicationHash(36.79000, -1.29151, '2025-01-01', '2026-06-30');
  assert.notEqual(hash1, hash3);
});
