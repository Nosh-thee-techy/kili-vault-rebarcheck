/**
 * Unit Tests: Spatial Risk & Prioritization Scoring
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSpatialRisk, RISK_LEVELS } = require('../../src/utils/riskScorer');

test('riskScorer - calculates bounded risk score between 0 and 100', () => {
  const result = calculateSpatialRisk({
    confidence_score: 0.85,
    area_m2: 2500,
    persistence_status: 'PERSISTENT_CHANGE',
    infrastructure_proximity_meters: 15,
    has_riparian_proximity: true,
  });

  assert.ok(result.risk_score >= 0 && result.risk_score <= 100);
  assert.equal(result.risk_level, RISK_LEVELS.CRITICAL);
  assert.equal(result.breakdown.riparian_critical_penalty, 35);
});

test('riskScorer - assigns LOW level for small low-confidence changes', () => {
  const result = calculateSpatialRisk({
    confidence_score: 0.40,
    area_m2: 120,
    persistence_status: 'NEW_DETECTION',
    infrastructure_proximity_meters: 500,
    has_riparian_proximity: false,
  });

  assert.ok(result.risk_score < 40);
  assert.equal(result.risk_level, RISK_LEVELS.LOW);
});
