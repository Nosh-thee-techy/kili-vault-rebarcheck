"use strict";

const db = require("./db");

const CASE_SELECT = `
  SELECT
    c.id, c.case_number, c.detection_id, c.title, c.change_type, c.status,
    c.confidence, c.risk, c.area_m2, c.centroid_lat, c.centroid_lon,
    ST_AsGeoJSON(c.geometry)::json AS geometry, c.evidence, c.parcel_ref,
    c.assigned_developer_id, c.mitigation_requirements, c.created_at, c.updated_at,
    COALESCE((SELECT json_agg(json_build_object(
      'id', a.id, 'action', a.action, 'actorRole', a.actor_role,
      'actorId', a.actor_id, 'actorName', a.actor_name,
      'timestamp', a.created_at, 'details', a.details
    ) ORDER BY a.created_at DESC) FROM case_audit_events a WHERE a.case_id = c.id), '[]'::json) AS audit_events,
    COALESCE((SELECT json_agg(json_build_object(
      'id', e.id, 'type', e.type, 'fileName', e.file_name,
      'url', COALESCE(e.storage_path, ''), 'uploadedBy', e.uploaded_by,
      'uploadedAt', e.created_at, 'status', e.status
    ) ORDER BY e.created_at DESC) FROM case_evidence_items e WHERE e.case_id = c.id), '[]'::json) AS evidence_items
  FROM development_cases c
`;

function mapCase(row) {
  if (!row) return null;
  return {
    id: row.id,
    caseNumber: row.case_number,
    detectionId: row.detection_id,
    title: row.title,
    changeType: row.change_type,
    status: row.status,
    confidence: Number(row.confidence),
    risk: row.risk || {
      planning: 0,
      infrastructure: 0,
      environmental: 0,
      community: 0,
      overall: "LOW",
    },
    areaM2: Number(row.area_m2),
    centroidLat: Number(row.centroid_lat),
    centroidLon: Number(row.centroid_lon),
    geometry: row.geometry,
    evidence: row.evidence || {},
    parcelRef: row.parcel_ref,
    assignedDeveloperId: row.assigned_developer_id,
    mitigationRequirements: row.mitigation_requirements || [],
    auditEvents: row.audit_events || [],
    evidenceItems: row.evidence_items || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class CaseRepository {
  async findAll(filters = {}) {
    const {
      status,
      change_type: changeType,
      search,
      limit = 50,
      offset = 0,
    } = filters;
    const conditions = [];
    const params = [];
    let index = 1;
    if (status) {
      conditions.push(`c.status = $${index++}`);
      params.push(status);
    }
    if (changeType) {
      conditions.push(`c.change_type = $${index++}`);
      params.push(changeType);
    }
    if (search) {
      conditions.push(
        `(c.title ILIKE $${index} OR c.case_number ILIKE $${index})`,
      );
      params.push(`%${search}%`);
      index += 1;
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const count = await db.query(
      `SELECT COUNT(*) AS total FROM development_cases c ${where}`,
      params,
    );
    const rows = await db.query(
      `${CASE_SELECT} ${where} ORDER BY c.updated_at DESC, c.created_at DESC LIMIT $${index} OFFSET $${index + 1}`,
      [...params, limit, offset],
    );
    return {
      data: rows.rows.map(mapCase),
      total: Number(count.rows[0].total),
      limit,
      offset,
    };
  }

  async findById(id) {
    const result = await db.query(`${CASE_SELECT} WHERE c.id = $1`, [id]);
    return mapCase(result.rows[0]);
  }

  async getGeoJson(filters = {}) {
    const result = await this.findAll({
      ...filters,
      limit: Math.min(filters.limit || 200, 200),
    });
    return {
      type: "FeatureCollection",
      features: result.data
        .filter((item) => item.geometry)
        .map((item) => ({
          type: "Feature",
          id: item.id,
          geometry: item.geometry,
          properties: {
            id: item.id,
            caseNumber: item.caseNumber,
            title: item.title,
            status: item.status,
            changeType: item.changeType,
            confidence: item.confidence,
          },
        })),
    };
  }

  async getStats() {
    const result = await db.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'AI_FLAGGED')::int AS ai_flagged,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW')::int AS under_review,
        COUNT(*) FILTER (WHERE status = 'MITIGATION_REQUIRED')::int AS mitigation_required,
        COUNT(*) FILTER (WHERE status IN ('EVIDENCE_SUBMITTED', 'AGENCY_PENDING'))::int AS pending_verification,
        COUNT(*) FILTER (WHERE (risk->>'overall') = 'HIGH')::int AS high_risk,
        COUNT(*) FILTER (WHERE status = 'CLOSED')::int AS closed
      FROM development_cases
    `);
    return result.rows[0];
  }

  async updateStatus(id, status, audit) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const updated = await client.query(
        "UPDATE development_cases SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
        [id, status],
      );
      if (!updated.rowCount) return null;
      await client.query(
        `INSERT INTO case_audit_events (case_id, action, actor_role, actor_id, actor_name, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          "STATUS_UPDATED",
          audit.role,
          audit.id,
          audit.name,
          audit.details || `Status changed to ${status}`,
        ],
      );
      await client.query("COMMIT");
      return this.findById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMitigation(id, requirements, audit) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const updated = await client.query(
        "UPDATE development_cases SET mitigation_requirements = $2::jsonb, status = 'MITIGATION_REQUIRED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
        [id, JSON.stringify(requirements)],
      );
      if (!updated.rowCount) return null;
      await client.query(
        `INSERT INTO case_audit_events (case_id, action, actor_role, actor_id, actor_name, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          "MITIGATION_ADDED",
          audit.role,
          audit.id,
          audit.name,
          requirements.join("; "),
        ],
      );
      await client.query("COMMIT");
      return this.findById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async verify(id, decision, audit) {
    const status = decision === "approved" ? "VERIFIED" : "REJECTED";
    return this.updateStatus(id, status, {
      ...audit,
      details: audit.details || `Agency verification: ${decision}`,
    });
  }

  async addEvidence(id, file, audit) {
    const result = await db.query(
      `INSERT INTO case_evidence_items (case_id, type, file_name, storage_path, uploaded_by, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        id,
        file.mimetype || "file",
        file.originalname,
        file.storagePath || "",
        audit.id,
        "SUBMITTED",
      ],
    );
    if (!result.rowCount) return null;
    await db.query(
      "UPDATE development_cases SET status = 'EVIDENCE_SUBMITTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id],
    );
    await db.query(
      `INSERT INTO case_audit_events (case_id, action, actor_role, actor_id, actor_name, details) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        "EVIDENCE_UPLOADED",
        audit.role,
        audit.id,
        audit.name,
        file.originalname,
      ],
    );
    return this.findById(id);
  }
}

module.exports = new CaseRepository();
