/**
 * Kili-Vault: Detection Repository
 * Handles spatial and attribute queries against the 'detections' PostGIS table.
 */
"use strict";

const db = require("./db");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const {
  calculateCentroid,
  calculateApproxAreaM2,
  calculateBbox,
} = require("../utils/geoUtils");
const { generateDeduplicationHash } = require("../utils/deduplicator");

class DetectionRepository {
  async findAll(filters = {}) {
    const {
      change_type,
      min_confidence,
      run_id,
      event_id,
      limit = 50,
      offset = 0,
    } = filters;

    try {
      const conditions = [];
      const params = [];
      let i = 1;

      if (change_type) {
        conditions.push(`change_type = $${i++}`);
        params.push(change_type);
      }
      if (min_confidence !== undefined) {
        conditions.push(`confidence >= $${i++}`);
        params.push(parseFloat(min_confidence));
      }
      if (run_id) {
        conditions.push(`run_id = $${i++}`);
        params.push(run_id);
      }
      if (event_id) {
        conditions.push(`event_id = $${i++}`);
        params.push(event_id);
      }

      const where =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const countRes = await db.query(
        `SELECT COUNT(*) AS total FROM detections ${where};`,
        params,
      );
      const total = parseInt(countRes.rows[0].total, 10);

      const listParams = [...params, limit, offset];
      const sql = `
          SELECT
            id, run_id, event_id, deduplication_hash, change_type, confidence,
            baseline_probability, prithvi_probability, ndbi_change, ndvi_change,
            temporal_persistence, area_m2, centroid_lat, centroid_lon,
            ST_AsGeoJSON(geometry)::json AS geometry,
            evidence, model_version, properties, created_at
          FROM detections
          ${where}
          ORDER BY confidence DESC, created_at DESC
          LIMIT $${i++} OFFSET $${i++};
        `;
      const res = await db.query(sql, listParams);
      return { data: res.rows, total, limit, offset };
    } catch (err) {
      logger.error("PostgreSQL find detections failed", { error: err.message });
      throw err;
    }
  }

  async findById(id) {
    try {
      const sql = `
          SELECT
            id, run_id, event_id, deduplication_hash, change_type, confidence,
            baseline_probability, prithvi_probability, ndbi_change, ndvi_change,
            temporal_persistence, area_m2, centroid_lat, centroid_lon,
            ST_AsGeoJSON(geometry)::json AS geometry,
            evidence, model_version, properties, created_at
          FROM detections
          WHERE id = $1;
        `;
      const res = await db.query(sql, [id]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (err) {
      logger.error("PostgreSQL find detection by id failed", {
        error: err.message,
      });
      throw err;
    }
    return null;
  }

  async create(data) {
    const id =
      data.id ||
      `det_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const geom = data.geometry || { type: "Polygon", coordinates: [] };
    const centroidLat =
      data.centroid_lat !== undefined
        ? data.centroid_lat
        : data.centroid
          ? data.centroid.coordinates[1]
          : 0;
    const centroidLon =
      data.centroid_lon !== undefined
        ? data.centroid_lon
        : data.centroid
          ? data.centroid.coordinates[0]
          : 0;

    const record = {
      id,
      run_id: data.run_id || data.processing_run_id || null,
      event_id: data.event_id || null,
      deduplication_hash: data.deduplication_hash || null,
      change_type: data.change_type || "UNKNOWN",
      confidence:
        data.confidence !== undefined
          ? data.confidence
          : data.confidence_score !== undefined
            ? data.confidence_score
            : 0.5,
      baseline_probability:
        data.baseline_probability !== undefined
          ? data.baseline_probability
          : null,
      prithvi_probability:
        data.prithvi_probability !== undefined
          ? data.prithvi_probability
          : null,
      ndbi_change: data.ndbi_change !== undefined ? data.ndbi_change : null,
      ndvi_change: data.ndvi_change !== undefined ? data.ndvi_change : null,
      temporal_persistence:
        data.temporal_persistence !== undefined
          ? data.temporal_persistence
          : 0.0,
      area_m2: data.area_m2 || 0,
      centroid_lat: centroidLat,
      centroid_lon: centroidLon,
      geometry: geom,
      evidence: data.evidence || data.confidence_factors || {},
      model_version: data.model_version || "kili-vault-dev-v0.1",
      properties: data.properties || {},
      created_at: data.created_at || new Date().toISOString(),
    };

    try {
      const sql = `
          INSERT INTO detections (
            id, run_id, event_id, deduplication_hash, change_type,
            confidence, baseline_probability, prithvi_probability,
            ndbi_change, ndvi_change, temporal_persistence, area_m2,
            centroid_lat, centroid_lon, geometry, evidence, model_version, properties
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8,
            $9, $10, $11, $12,
            $13, $14, ST_SetSRID(ST_GeomFromGeoJSON($15), 4326), $16, $17, $18
          )
          ON CONFLICT (deduplication_hash) WHERE deduplication_hash IS NOT NULL DO UPDATE SET
            run_id = EXCLUDED.run_id,
            confidence = EXCLUDED.confidence,
            change_type = EXCLUDED.change_type,
            baseline_probability = EXCLUDED.baseline_probability,
            prithvi_probability = EXCLUDED.prithvi_probability,
            ndbi_change = EXCLUDED.ndbi_change,
            ndvi_change = EXCLUDED.ndvi_change,
            temporal_persistence = EXCLUDED.temporal_persistence,
            area_m2 = EXCLUDED.area_m2,
            geometry = EXCLUDED.geometry,
            evidence = EXCLUDED.evidence,
            model_version = EXCLUDED.model_version,
            properties = EXCLUDED.properties
          RETURNING
            id, run_id, event_id, deduplication_hash, change_type, confidence,
            baseline_probability, prithvi_probability, ndbi_change, ndvi_change,
            temporal_persistence, area_m2, centroid_lat, centroid_lon,
            ST_AsGeoJSON(geometry)::json AS geometry,
            evidence, model_version, properties, created_at;
        `;
      const params = [
        record.id,
        record.run_id,
        record.event_id,
        record.deduplication_hash,
        record.change_type,
        record.confidence,
        record.baseline_probability,
        record.prithvi_probability,
        record.ndbi_change,
        record.ndvi_change,
        record.temporal_persistence,
        record.area_m2,
        record.centroid_lat,
        record.centroid_lon,
        JSON.stringify(record.geometry),
        JSON.stringify(record.evidence),
        record.model_version,
        JSON.stringify(record.properties),
      ];
      const res = await db.query(sql, params);
      if (res.rows.length > 0) return res.rows[0];
    } catch (err) {
      logger.error("PostgreSQL insert detection failed", {
        error: err.message,
      });
      throw err;
    }
  }

  async getStats() {
    try {
      const sql = `
          SELECT
            COUNT(*) AS total_detections,
            COUNT(*) FILTER (WHERE change_type = 'BUILDING_DEVELOPMENT') AS building_development,
            COUNT(*) FILTER (WHERE change_type = 'INFRASTRUCTURE_CHANGE') AS infrastructure_change,
            COUNT(*) FILTER (WHERE change_type = 'LAND_CLEARING') AS land_clearing,
            COUNT(*) FILTER (WHERE change_type = 'VEGETATION_CHANGE') AS vegetation_change,
            COUNT(*) FILTER (WHERE change_type = 'SURFACE_CHANGE') AS surface_change,
            COUNT(*) FILTER (WHERE change_type = 'UNKNOWN') AS unknown_change,
            COALESCE(AVG(confidence), 0) AS avg_confidence,
            COALESCE(SUM(area_m2), 0) AS total_area_m2
          FROM detections;
        `;
      const res = await db.query(sql);
      const row = res.rows[0];
      return {
        total_detections: Number(row.total_detections),
        building_development: Number(row.building_development),
        infrastructure_change: Number(row.infrastructure_change),
        land_clearing: Number(row.land_clearing),
        vegetation_change: Number(row.vegetation_change),
        surface_change: Number(row.surface_change),
        unknown_change: Number(row.unknown_change),
        avg_confidence: Number(row.avg_confidence),
        total_area_m2: Number(row.total_area_m2),
        breakdown: {
          BUILDING_DEVELOPMENT: Number(row.building_development),
          INFRASTRUCTURE_CHANGE: Number(row.infrastructure_change),
          LAND_CLEARING: Number(row.land_clearing),
          VEGETATION_CHANGE: Number(row.vegetation_change),
          SURFACE_CHANGE: Number(row.surface_change),
          UNKNOWN: Number(row.unknown_change),
        },
      };
    } catch (err) {
      logger.error("PostgreSQL detection stats failed", { error: err.message });
      throw err;
    }
  }
}

module.exports = new DetectionRepository();
