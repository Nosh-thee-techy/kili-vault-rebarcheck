/**
 * Kili-Vault Backend: Idempotency & Spatial Deduplication Module
 * Prevents redundant detection records when scheduled Earth Engine pipelines run periodically.
 */
'use strict';

const crypto = require('crypto');

/**
 * Generates a stable spatial-temporal deduplication hash based on quantized coordinates and date period.
 * Quantizing coordinates to ~15-meter grid cells (~0.00015 degrees) matches Sentinel-2 10m-20m pixel resolutions.
 */
function generateDeduplicationHash(centroidLon, centroidLat, baselinePeriodStart, recentPeriodEnd) {
  const quantLon = (Math.round(centroidLon / 0.00015) * 0.00015).toFixed(5);
  const quantLat = (Math.round(centroidLat / 0.00015) * 0.00015).toFixed(5);
  const rawKey = `${quantLon}:${quantLat}:${baselinePeriodStart}:${recentPeriodEnd}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

module.exports = {
  generateDeduplicationHash,
};
