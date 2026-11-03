/**
 * Kili-Vault Backend: Processing Run Repository
 * Tracks Earth Engine execution runs for complete pipeline reproducibility and provenance.
 */
"use strict";

const db = require("./db");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const config = require("../config");

class ProcessingRunRepository {
  async findAll(limit = 20, offset = 0) {
    const pool = db.getPool();
    if (pool) {
      try {
        const countSql = `SELECT COUNT(*) AS total FROM detection_runs;`;
        const countRes = await db.query(countSql);
        const total = parseInt(countRes.rows[0].total, 10);

        const sql = `
          SELECT *, created_at AS started_at
          FROM detection_runs
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2;
        `;
        const res = await db.query(sql, [limit, offset]);
        return { data: res.rows, total, limit, offset };
      } catch (err) {
        logger.error("PostgreSQL find processing runs failed", {
          error: err.message,
        });
        throw err;
      }
    }
  }

  async findById(id) {
    const pool = db.getPool();
    if (pool) {
      try {
        const sql = `SELECT *, created_at AS started_at FROM detection_runs WHERE id = $1;`;
        const res = await db.query(sql, [id]);
        if (res.rows.length > 0) return res.rows[0];
      } catch (err) {
        logger.error("PostgreSQL find processing run by id failed", {
          error: err.message,
        });
        throw err;
      }
    }
    return null;
  }

  async create(runData) {
    const id = runData.id || uuidv4();
    const record = {
      id,
      aoi_name: runData.aoi_name || "Kilimani Ward",
      baseline_start_date:
        runData.baseline_start_date || config.BASELINE_START_DATE,
      baseline_end_date: runData.baseline_end_date || config.BASELINE_END_DATE,
      recent_start_date: runData.recent_start_date || config.RECENT_START_DATE,
      recent_end_date: runData.recent_end_date || config.RECENT_END_DATE,
      imagery_count: runData.imagery_count || 0,
      model_version: runData.model_version || config.PROCESSING_VERSION,
      status: runData.status || "PENDING",
      detections_count: runData.detections_count || 0,
      breakdown: runData.breakdown || {},
      error_message: runData.error_message || null,
      metadata: runData.metadata || {
        aoi_asset_path: runData.aoi_asset_path || config.GEE_AOI_ASSET || null,
        dataset: runData.dataset || "Sentinel-2 Harmonized Surface Reflectance",
        cloud_threshold_percent:
          runData.cloud_threshold_percent || config.S2_CLOUD_THRESHOLD,
        min_valid_observations:
          runData.min_valid_observations || config.MIN_VALID_OBSERVATIONS,
        min_candidate_area_m2:
          runData.min_candidate_area_m2 || config.MIN_CANDIDATE_AREA_M2,
        max_candidate_area_m2:
          runData.max_candidate_area_m2 || config.MAX_CANDIDATE_AREA_M2,
        min_confidence_score:
          runData.min_confidence_score || config.MIN_CONFIDENCE,
        spatial_resolution_meters:
          runData.spatial_resolution_meters || config.SPATIAL_RESOLUTION_METERS,
        algorithm_version:
          runData.algorithm_version || config.ALGORITHM_VERSION,
        parameters: runData.parameters || {},
      },
      created_at: new Date().toISOString(),
    };

    const pool = db.getPool();
    if (pool) {
      try {
        const sql = `
          INSERT INTO detection_runs (
            id, run_type, status, aoi_name,
            baseline_start_date, baseline_end_date, recent_start_date, recent_end_date,
            imagery_count, detections_count, model_version,
            breakdown, error_message, metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14
          ) ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            detections_count = EXCLUDED.detections_count,
            breakdown = EXCLUDED.breakdown,
            error_message = EXCLUDED.error_message,
            metadata = EXCLUDED.metadata
          RETURNING *;
        `;
        const res = await db.query(sql, [
          record.id,
          runData.run_type || "SENTINEL2_DIFFERENCING",
          record.status,
          record.aoi_name,
          record.baseline_start_date,
          record.baseline_end_date,
          record.recent_start_date,
          record.recent_end_date,
          record.imagery_count,
          record.detections_count,
          record.model_version,
          JSON.stringify(record.breakdown),
          record.error_message,
          JSON.stringify(record.metadata),
        ]);
        return res.rows[0];
      } catch (err) {
        logger.error("PostgreSQL insert processing run failed", {
          error: err.message,
        });
        throw err;
      }
    }
  }

  async update(id, updateData) {
    const fields = [];
    const params = [];
    const allowed = [
      "status",
      "imagery_count",
      "detections_count",
      "model_version",
      "execution_duration_ms",
      "error_message",
    ];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updateData, key)) {
        fields.push(`${key} = $${params.length + 1}`);
        params.push(updateData[key]);
      }
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "breakdown")) {
      fields.push(`breakdown = $${params.length + 1}`);
      params.push(JSON.stringify(updateData.breakdown));
    }
    if (!fields.length) return this.findById(id);
    params.push(id);
    const res = await db.query(
      `UPDATE detection_runs SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *;`,
      params,
    );
    return res.rows[0] || null;
  }
}

module.exports = new ProcessingRunRepository();
