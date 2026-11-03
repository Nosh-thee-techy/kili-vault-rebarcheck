/**
 * Kili-Vault Backend: Spatial Risk Scorer
 * Calculates a transparent spatial review priority score (0-100) for human inspection.
 * NOTE: This is strictly a spatial prioritization metric for planners, NEVER a legal violation score.
 */
'use strict';

/**
 * Calculates risk score and factors breakdown based on spatial and temporal indicators.
 * @param {Object} params
 * @param {number} params.confidenceScore - Remote sensing confidence (0.0 - 1.0)
 * @param {number} params.areaM2 - Candidate polygon area in square meters
 * @param {string} params.changeType - Candidate change classification
 * @param {string} params.persistenceStatus - 'NEW_DETECTION', 'PERSISTENT_CHANGE', etc.
 * @param {Array} params.infrastructureInteractions - Detected nearby infrastructure features
 */
const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

function calculateRiskScore(rawParams = {}) {
  const confidenceScore = rawParams.confidenceScore ?? rawParams.confidence_score ?? 0.5;
  const areaM2 = rawParams.areaM2 ?? rawParams.area_m2 ?? 200;
  const changeType = rawParams.changeType ?? rawParams.change_type ?? 'UNKNOWN';
  const persistenceStatus = rawParams.persistenceStatus ?? rawParams.persistence_status ?? 'NEW_DETECTION';
  const infrastructureInteractions = rawParams.infrastructureInteractions ?? rawParams.infrastructure_interactions ?? [];
  // Factor 1: Change confidence weight (up to 30 points)
  const confidenceFactor = Math.min(Math.max(confidenceScore, 0), 1);
  const confidencePoints = Math.round(confidenceFactor * 30);

  // Factor 2: Development footprint scale weight (up to 25 points)
  // Scale benchmarks: 100m2 = small plot, 1000m2+ = multi-unit/commercial, 5000m2+ = major project
  let scaleFactor = 0.2;
  if (areaM2 > 5000) scaleFactor = 1.0;
  else if (areaM2 > 2000) scaleFactor = 0.85;
  else if (areaM2 > 800) scaleFactor = 0.65;
  else if (areaM2 > 300) scaleFactor = 0.45;
  const scalePoints = Math.round(scaleFactor * 25);

  // Factor 3: Temporal persistence weight (up to 20 points)
  let persistenceFactor = 0.4;
  if (persistenceStatus === 'PERSISTENT_CHANGE') persistenceFactor = 1.0;
  else if (persistenceStatus === 'RECURRING_CHANGE') persistenceFactor = 0.85;
  else if (persistenceStatus === 'NEW_DETECTION') persistenceFactor = 0.5;
  else if (persistenceStatus === 'SINGLE_OBSERVATION') persistenceFactor = 0.25;
  const persistencePoints = Math.round(persistenceFactor * 20);

  // Factor 4: Infrastructure & sensitive area proximity (up to 25 points)
  let infraFactor = 0.1;
  let hasRiparian = Boolean(rawParams.has_riparian_proximity || rawParams.hasRiparianProximity);
  let hasRoad = Boolean(rawParams.has_road_proximity || rawParams.hasRoadProximity);
  let hasDrainage = Boolean(rawParams.has_drainage_proximity || rawParams.hasDrainageProximity);

  for (const interaction of infrastructureInteractions) {
    if (interaction.infrastructure_type === 'RIPARIAN') hasRiparian = true;
    if (interaction.infrastructure_type === 'ROADS') hasRoad = true;
    if (interaction.infrastructure_type === 'DRAINAGE') hasDrainage = true;
  }

  if (hasRiparian) infraFactor += 0.5;
  if (hasDrainage) infraFactor += 0.25;
  if (hasRoad) infraFactor += 0.15;
  infraFactor = Math.min(infraFactor, 1.0);
  const infraPoints = Math.round(infraFactor * 25);

  // Total calculated score (0 - 100)
  let totalScore = confidencePoints + scalePoints + persistencePoints + infraPoints;
  totalScore = Math.min(Math.max(totalScore, 0), 100);

  // Determine categorical priority level
  let riskLevel = RISK_LEVELS.LOW;
  if (totalScore >= 80) riskLevel = RISK_LEVELS.CRITICAL;
  else if (totalScore >= 60) riskLevel = RISK_LEVELS.HIGH;
  else if (totalScore >= 35) riskLevel = RISK_LEVELS.MEDIUM;

  return {
    risk_score: totalScore,
    risk_level: riskLevel,
    breakdown: {
      riparian_critical_penalty: hasRiparian ? 35 : 0,
      confidence_points: confidencePoints,
      scale_points: scalePoints,
      persistence_points: persistencePoints,
      infrastructure_points: infraPoints,
    },
    risk_factors: {
      change_confidence: parseFloat(confidenceFactor.toFixed(2)),
      development_scale: parseFloat(scaleFactor.toFixed(2)),
      persistence_weight: parseFloat(persistenceFactor.toFixed(2)),
      infrastructure_proximity: parseFloat(infraFactor.toFixed(2)),
      has_riparian_proximity: hasRiparian,
      has_drainage_proximity: hasDrainage,
      has_road_proximity: hasRoad,
      points_breakdown: {
        confidence_points: confidencePoints,
        scale_points: scalePoints,
        persistence_points: persistencePoints,
        infrastructure_points: infraPoints,
      }
    }
  };
}

module.exports = {
  calculateRiskScore,
  calculateSpatialRisk: calculateRiskScore,
  RISK_LEVELS,
};
