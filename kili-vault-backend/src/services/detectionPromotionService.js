'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../repositories/db');
const caseRepository = require('../repositories/caseRepository');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const DEFAULT_DEVELOPER_ID = process.env.DEFAULT_DEVELOPER_ID || 'dev_kilimani_001';

function buildRisk(confidence, changeType) {
  const base = Math.round(confidence * 100);
  const planning = Math.min(100, base + (changeType === 'BUILDING_DEVELOPMENT' ? 8 : 0));
  const infrastructure = Math.min(
    100,
    base + (changeType === 'INFRASTRUCTURE_CHANGE' ? 12 : 4),
  );
  const environmental = Math.min(100, base - 10);
  const community = Math.min(100, Math.round((planning + infrastructure) / 2 - 5));
  let overall = 'LOW';
  if (confidence >= 0.8 && ['INFRASTRUCTURE_CHANGE', 'BUILDING_DEVELOPMENT'].includes(changeType)) {
    overall = 'HIGH';
  } else if (confidence >= 0.65) overall = 'MEDIUM';
  return { planning, infrastructure, environmental, community, overall };
}

async function findPromotableDetections(minConfidence, limit) {
  const sql = `
    SELECT
      d.id, d.change_type, d.confidence, d.area_m2, d.centroid_lat, d.centroid_lon,
      ST_AsGeoJSON(d.geometry)::json AS geometry, d.evidence, d.ndbi_change, d.ndvi_change
    FROM detections d
    LEFT JOIN development_cases c ON c.detection_id = d.id
    WHERE c.id IS NULL
      AND d.confidence >= $1
      AND d.geometry IS NOT NULL
    ORDER BY d.confidence DESC, d.created_at DESC
    LIMIT $2
  `;
  const res = await db.query(sql, [minConfidence, limit]);
  return res.rows;
}

async function nextCaseNumber(client) {
  const res = await client.query(
    `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(case_number, '\\D', '', 'g') AS INTEGER)), 10126) + 1 AS n
     FROM development_cases`,
  );
  const n = res.rows[0].n;
  return `KV-${String(n).padStart(5, '0')}`;
}

async function insertCaseFromDetection(detection, actor) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const caseNumber = await nextCaseNumber(client);
    const caseId = `case_${uuidv4().slice(0, 8)}`;
    const changeType = detection.change_type;
    const title = `Kili-Shadows: ${changeType.replace(/_/g, ' ').toLowerCase()} near ${Number(detection.centroid_lat).toFixed(4)}, ${Number(detection.centroid_lon).toFixed(4)}`;
    const risk = buildRisk(Number(detection.confidence), changeType);
    const now = new Date().toISOString();

    await client.query(
      `INSERT INTO development_cases (
         id, case_number, detection_id, title, change_type, status, confidence,
         risk, area_m2, centroid_lat, centroid_lon, geometry, evidence,
         assigned_developer_id, mitigation_requirements, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, 'AI_FLAGGED', $6,
         $7::jsonb, $8, $9, $10, ST_SetSRID(ST_GeomFromGeoJSON($11), 4326), $12::jsonb,
         $14, '[]'::jsonb, $13, $13
       )`,
      [
        caseId,
        caseNumber,
        detection.id,
        title,
        changeType,
        detection.confidence,
        JSON.stringify(risk),
        detection.area_m2,
        detection.centroid_lat,
        detection.centroid_lon,
        JSON.stringify(detection.geometry),
        JSON.stringify(detection.evidence || {}),
        now,
        DEFAULT_DEVELOPER_ID,
      ],
    );

    await client.query(
      `INSERT INTO case_audit_events (id, case_id, action, actor_role, actor_id, actor_name, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuidv4(),
        caseId,
        'CASE_CREATED',
        actor.role,
        actor.id,
        actor.name,
        `Promoted from detection ${detection.id} (confidence ${Number(detection.confidence).toFixed(2)})`,
        now,
      ],
    );

    await client.query('COMMIT');
    return caseRepository.findById(caseId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function promoteDetections(options = {}, actor) {
  const storage = await caseRepository.getStorageInfo();
  if (storage.mode !== 'postgres') {
    throw new AppError(
      'UNAVAILABLE',
      'Detection promotion requires PostgreSQL/Supabase (cases + detections tables)',
      503,
    );
  }

  const minConfidence =
    options.min_confidence !== undefined
      ? Number(options.min_confidence)
      : Number(process.env.HIGH_CONFIDENCE_THRESHOLD) || 0.75;
  const limit = Math.min(Number(options.limit) || 25, 100);

  const candidates = await findPromotableDetections(minConfidence, limit);
  const promoted = [];
  const skipped = [];

  for (const detection of candidates) {
    try {
      const caseItem = await insertCaseFromDetection(detection, actor);
      promoted.push({ detectionId: detection.id, caseId: caseItem.id, caseNumber: caseItem.caseNumber });
    } catch (err) {
      logger.warn('[promote] Skipped detection', { id: detection.id, error: err.message });
      skipped.push({ detectionId: detection.id, reason: err.message });
    }
  }

  return {
    min_confidence: minConfidence,
    candidates: candidates.length,
    promoted_count: promoted.length,
    skipped_count: skipped.length,
    promoted,
    skipped,
  };
}

async function countUnpromoted(minConfidence = 0.65) {
  const res = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM detections d
     LEFT JOIN development_cases c ON c.detection_id = d.id
     WHERE c.id IS NULL AND d.confidence >= $1`,
    [minConfidence],
  );
  return res.rows[0].n;
}

module.exports = {
  promoteDetections,
  countUnpromoted,
  findPromotableDetections,
};
