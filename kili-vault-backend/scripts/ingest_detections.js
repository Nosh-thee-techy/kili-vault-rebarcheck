/**
 * Kili-Vault Backend: Data Ingestion Script
 * Ingests output/detections.geojson into PostgreSQL/PostGIS with strict data validation
 * and spatial deduplication to guarantee idempotency across weekly scheduled runs.
 *
 * Usage:
 *   node scripts/ingest_detections.js [path/to/detections.geojson] [path/to/summary.json]
 */
"use strict";

const fs = require("fs");
const path = require("path");
const config = require("../src/config");
const db = require("../src/repositories/db");
const detectionRepository = require("../src/repositories/detectionRepository");
const processingRunRepository = require("../src/repositories/processingRunRepository");
const { generateDeduplicationHash } = require("../src/utils/deduplicator");
const { isValidBbox } = require("../src/utils/geoUtils");
const logger = require("../src/utils/logger");

const VALID_CHANGE_TYPES = [
  "BUILDING_DEVELOPMENT",
  "INFRASTRUCTURE_CHANGE",
  "LAND_CLEARING",
  "VEGETATION_CHANGE",
  "SURFACE_CHANGE",
  "UNKNOWN",
];

const CHANGE_TYPE_ALIASES = {
  BUILDING_CANDIDATE: "BUILDING_DEVELOPMENT",
  INFRASTRUCTURE_CANDIDATE: "INFRASTRUCTURE_CHANGE",
};

async function ensureDetectionDeduplicationIndex() {
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_detections_deduplication_hash
    ON detections(deduplication_hash)
    WHERE deduplication_hash IS NOT NULL
  `);
}

async function ingest() {
  const geojsonPath =
    process.argv[2] || path.resolve(__dirname, "../output/detections.geojson");
  const summaryPath =
    process.argv[3] ||
    path.resolve(__dirname, "../output/processing_summary.json");

  logger.info(`[INGEST] Starting detection ingestion from: ${geojsonPath}`);

  if (!fs.existsSync(geojsonPath)) {
    logger.error(`[INGEST ERROR] GeoJSON file not found at: ${geojsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(geojsonPath, "utf8");
  let featureCollection;
  try {
    featureCollection = JSON.parse(rawData);
  } catch (err) {
    logger.error("[INGEST ERROR] Failed to parse GeoJSON JSON", {
      error: err.message,
    });
    process.exit(1);
  }

  if (
    featureCollection.type !== "FeatureCollection" ||
    !Array.isArray(featureCollection.features)
  ) {
    logger.error("[INGEST ERROR] Invalid GeoJSON: Expected FeatureCollection");
    process.exit(1);
  }

  try {
    await ensureDetectionDeduplicationIndex();
  } catch (err) {
    logger.error(
      "[INGEST ERROR] Detection deduplication index is unavailable",
      {
        error: err.message,
      },
    );
    process.exit(1);
  }

  // Load summary if available to link processing run
  let summary = null;
  if (fs.existsSync(summaryPath)) {
    try {
      summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    } catch (err) {
      logger.warn("[INGEST WARNING] Failed to parse summary JSON", {
        error: err.message,
      });
    }
  }

  // Register processing run in database
  let processingRunId = null;
  if (summary && summary.run_id) {
    try {
      const runRecord = await processingRunRepository.create({
        id: summary.run_id,
        status:
          summary.status === "FAILED"
            ? "FAILED"
            : summary.status === "RUNNING"
              ? "RUNNING"
              : "COMPLETED",
        detections_count: featureCollection.features.length,
        warnings: summary.warnings || [],
        errors: summary.errors || [],
        parameters: summary.parameters || {},
        started_at: summary.started_at,
        completed_at: summary.completed_at,
      });
      processingRunId = runRecord.id;
      logger.info(
        `[INGEST] Associated with Processing Run: ${processingRunId}`,
      );
    } catch (err) {
      logger.warn("[INGEST] Could not record processing run", {
        error: err.message,
      });
    }
  }

  let insertedCount = 0;
  let skippedDuplicates = 0;
  let validationErrors = 0;
  const pendingWrites = [];
  const batchSize = 50;

  for (const feature of featureCollection.features) {
    const props = feature.properties || {};
    const geom = feature.geometry;

    // 1. Data Validation (#31)
    if (
      !geom ||
      !["Polygon", "MultiPolygon"].includes(geom.type) ||
      !Array.isArray(geom.coordinates) ||
      geom.coordinates.length === 0
    ) {
      logger.warn("[INGEST REJECT] Invalid geometry on feature", {
        id: feature.id,
      });
      validationErrors++;
      continue;
    }

    const areaM2 = props.area_m2;
    if (typeof areaM2 !== "number" || areaM2 <= 0 || areaM2 > 1000000) {
      logger.warn("[INGEST REJECT] Unreasonable or non-positive area_m2", {
        id: feature.id,
        areaM2,
      });
      validationErrors++;
      continue;
    }

    const confidence = props.confidence_score;
    if (
      typeof confidence !== "number" ||
      confidence < 0.0 ||
      confidence > 1.0
    ) {
      logger.warn("[INGEST REJECT] Confidence score out of bounds (0-1)", {
        id: feature.id,
        confidence,
      });
      validationErrors++;
      continue;
    }

    const rawChangeType = props.change_type || "UNKNOWN";
    const changeType = CHANGE_TYPE_ALIASES[rawChangeType] || rawChangeType;
    if (!VALID_CHANGE_TYPES.includes(changeType)) {
      logger.warn("[INGEST REJECT] Invalid change_type", {
        id: feature.id,
        changeType,
      });
      validationErrors++;
      continue;
    }

    const centroid = props.centroid;
    if (
      !centroid ||
      !Array.isArray(centroid.coordinates) ||
      centroid.coordinates.length !== 2
    ) {
      logger.warn("[INGEST REJECT] Missing or malformed centroid", {
        id: feature.id,
      });
      validationErrors++;
      continue;
    }

    const [lon, lat] = centroid.coordinates;
    const baseStart = props.baseline_period_start || config.BASELINE_START_DATE;
    const recEnd = props.recent_period_end || config.RECENT_END_DATE;

    // 2. Spatial Deduplication (#29 Idempotency)
    const dedupHash = generateDeduplicationHash(lon, lat, baseStart, recEnd);

    // Queue writes in bounded batches so ingestion does not serialize every round trip.
    pendingWrites.push(
      detectionRepository
        .create({
          id: feature.id,
          processing_run_id: processingRunId,
          geometry: geom,
          centroid,
          area_m2: areaM2,
          bbox: props.bbox,
          detection_date: props.detection_date || recEnd,
          baseline_period_start: baseStart,
          baseline_period_end:
            props.baseline_period_end || config.BASELINE_END_DATE,
          recent_period_start:
            props.recent_period_start || config.RECENT_START_DATE,
          recent_period_end: recEnd,
          change_type: changeType,
          confidence_score: confidence,
          confidence_factors: props.confidence_factors || {},
          persistence_status: props.persistence_status || "NEW_DETECTION",
          risk_score: props.risk_score || 50,
          risk_level: props.risk_level || "MEDIUM",
          risk_factors: props.risk_factors || {},
          baseline_probability: props.baseline_probability,
          prithvi_probability: props.prithvi_probability,
          ndbi_change: props.ndbi_change,
          ndvi_change: props.ndvi_change,
          temporal_persistence: props.temporal_persistence,
          source: props.source || "Sentinel-2 L2A",
          model_version: props.model_version || "gee_s2_v1",
          processing_version:
            props.processing_version || config.PROCESSING_VERSION,
          review_status: "AI_FLAGGED",
          deduplication_hash: dedupHash,
        })
        .then((record) => {
          if (record) insertedCount++;
        })
        .catch((err) => {
          if (err.message && err.message.includes("unique constraint")) {
            skippedDuplicates++;
          } else {
            logger.error("[INGEST ERROR] Failed to insert detection", {
              id: feature.id,
              error: err.message,
            });
          }
        }),
    );

    if (pendingWrites.length >= batchSize) {
      await Promise.all(pendingWrites.splice(0, batchSize));
    }
  }

  await Promise.all(pendingWrites);

  logger.info("\n================ INGESTION SUMMARY ================");
  logger.info(`Total Features Processed: ${featureCollection.features.length}`);
  logger.info(`Successfully Ingested:   ${insertedCount}`);
  logger.info(`Duplicates Skipped:       ${skippedDuplicates}`);
  logger.info(`Validation Failures:      ${validationErrors}`);
  logger.info("===================================================\n");

  await db.closePool();
}

ingest().catch((err) => {
  logger.error("[INGEST FATAL]", { error: err.message, stack: err.stack });
  process.exit(1);
});
