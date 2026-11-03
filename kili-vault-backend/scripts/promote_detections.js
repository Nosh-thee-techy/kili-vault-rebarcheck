#!/usr/bin/env node
/**
 * Promote high-confidence detections → development cases (AI_FLAGGED).
 *
 * Usage:
 *   node scripts/promote_detections.js [--min-confidence=0.75] [--limit=25]
 */
'use strict';

require('dotenv').config();
const detectionPromotionService = require('../src/services/detectionPromotionService');
const db = require('../src/repositories/db');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

async function main() {
  const minConfidence = Number(arg('min-confidence', process.env.HIGH_CONFIDENCE_THRESHOLD || 0.75));
  const limit = Number(arg('limit', 25));

  const result = await detectionPromotionService.promoteDetections(
    { min_confidence: minConfidence, limit },
    { role: 'system', id: 'kili-shadows', name: 'Kili-Shadows CLI' },
  );

  console.log('\n=== Detection promotion ===\n');
  console.log(`Min confidence: ${result.min_confidence}`);
  console.log(`Candidates:     ${result.candidates}`);
  console.log(`Promoted:       ${result.promoted_count}`);
  console.log(`Skipped:        ${result.skipped_count}\n`);

  if (result.promoted.length) {
    result.promoted.forEach((p) => {
      console.log(`  ✓ ${p.detectionId} → ${p.caseNumber} (${p.caseId})`);
    });
  }

  await db.closePool();
}

main().catch((err) => {
  console.error('Promotion failed:', err.message);
  process.exit(1);
});
