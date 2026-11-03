'use strict';

const path = require('path');
const fs = require('fs');
const db = require('./db');
const logger = require('../utils/logger');

const EVIDENCE_DIR = path.resolve(__dirname, '../../data/evidence');

const STATUSES = [
  'AI_FLAGGED',
  'UNDER_REVIEW',
  'MITIGATION_REQUIRED',
  'EVIDENCE_SUBMITTED',
  'AGENCY_PENDING',
  'VERIFIED',
  'REJECTED',
  'CLOSED',
];

function mapAuditEvent(row) {
  return {
    id: row.id,
    action: row.action,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    actorName: row.actor_name,
    timestamp: row.created_at,
    details: row.details,
  };
}

function mapEvidenceItem(row) {
  return {
    id: row.id,
    type: row.type,
    fileName: row.file_name,
    url: row.storage_path,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.created_at,
    status: row.status,
  };
}

function toApiCase(row, auditEvents = [], evidenceItems = []) {
  return {
    id: row.id,
    caseNumber: row.case_number,
    detectionId: row.detection_id,
    title: row.title,
    changeType: row.change_type,
    status: row.status,
    confidence: row.confidence,
    risk: row.risk,
    areaM2: row.area_m2,
    centroidLat: row.centroid_lat,
    centroidLon: row.centroid_lon,
    geometry: row.geometry,
    evidence: row.evidence,
    parcelRef: row.parcel_ref,
    assignedDeveloperId: row.assigned_developer_id,
    mitigationRequirements: row.mitigation_requirements || [],
    auditEvents: auditEvents.map(mapAuditEvent),
    evidenceItems: evidenceItems.map(mapEvidenceItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadRelated(caseId) {
  const [auditRes, evidenceRes] = await Promise.all([
    db.query(
      `SELECT id, action, actor_role, actor_id, actor_name, details, created_at
       FROM case_audit_events WHERE case_id = $1 ORDER BY created_at DESC`,
      [caseId],
    ),
    db.query(
      `SELECT id, type, file_name, storage_path, uploaded_by, status, created_at
       FROM case_evidence_items WHERE case_id = $1 ORDER BY created_at DESC`,
      [caseId],
    ),
  ]);
  return { auditEvents: auditRes.rows, evidenceItems: evidenceRes.rows };
}

function buildWhere(filters, params) {
  const conditions = [];
  let i = params.length + 1;

  if (filters.status) {
    conditions.push(`status = $${i++}`);
    params.push(filters.status);
  }
  if (filters.change_type) {
    conditions.push(`change_type = $${i++}`);
    params.push(filters.change_type);
  }
  if (filters.assigned_developer_id) {
    conditions.push(`assigned_developer_id = $${i++}`);
    params.push(filters.assigned_developer_id);
  }
  if (filters.agency_queue) {
    conditions.push(`status IN ('AGENCY_PENDING', 'EVIDENCE_SUBMITTED')`);
  }
  if (filters.search) {
    conditions.push(
      `(case_number ILIKE $${i} OR title ILIKE $${i} OR parcel_ref ILIKE $${i})`,
    );
    params.push(`%${filters.search}%`);
    i++;
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', nextIndex: i };
}

class CaseDbStore {
  async findAll(filters = {}) {
    const params = [];
    const { where, nextIndex } = buildWhere(filters, params);
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM development_cases ${where}`,
      params,
    );
    const total = countRes.rows[0].total;

    const listParams = [...params, limit, offset];
    const res = await db.query(
      `SELECT
         id, case_number, detection_id, title, change_type, status, confidence,
         risk, area_m2, centroid_lat, centroid_lon,
         ST_AsGeoJSON(geometry)::json AS geometry,
         evidence, parcel_ref, assigned_developer_id, mitigation_requirements,
         created_at, updated_at
       FROM development_cases
       ${where}
       ORDER BY updated_at DESC
       LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
      listParams,
    );

    const data = await Promise.all(
      res.rows.map(async (row) => {
        const { auditEvents, evidenceItems } = await loadRelated(row.id);
        return toApiCase(row, auditEvents, evidenceItems);
      }),
    );

    return { data, total, limit, offset };
  }

  async findById(id) {
    const res = await db.query(
      `SELECT
         id, case_number, detection_id, title, change_type, status, confidence,
         risk, area_m2, centroid_lat, centroid_lon,
         ST_AsGeoJSON(geometry)::json AS geometry,
         evidence, parcel_ref, assigned_developer_id, mitigation_requirements,
         created_at, updated_at
       FROM development_cases
       WHERE id = $1 OR case_number = $1`,
      [id],
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    const { auditEvents, evidenceItems } = await loadRelated(row.id);
    return toApiCase(row, auditEvents, evidenceItems);
  }

  async updateStatus(id, status, auditEntry) {
    if (!STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        'SELECT id FROM development_cases WHERE id = $1 OR case_number = $1',
        [id],
      );
      if (!existing.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }
      const caseId = existing.rows[0].id;

      await client.query(
        `UPDATE development_cases SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, caseId],
      );
      await client.query(
        `INSERT INTO case_audit_events (id, case_id, action, actor_role, actor_id, actor_name, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          auditEntry.id,
          caseId,
          auditEntry.action,
          auditEntry.actor_role,
          auditEntry.actor_id,
          auditEntry.actor_name,
          auditEntry.details,
          auditEntry.timestamp || new Date().toISOString(),
        ],
      );
      await client.query('COMMIT');
      return this.findById(caseId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async addMitigation(id, payload, auditEntry) {
    const requirements = payload.requirements || payload;
    const assignedDeveloperId = payload.assignedDeveloperId || null;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        'SELECT id FROM development_cases WHERE id = $1 OR case_number = $1',
        [id],
      );
      if (!existing.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }
      const caseId = existing.rows[0].id;

      await client.query(
        `UPDATE development_cases
         SET mitigation_requirements = $1::jsonb,
             assigned_developer_id = COALESCE($2, assigned_developer_id),
             status = 'MITIGATION_REQUIRED',
             updated_at = NOW()
         WHERE id = $3`,
        [JSON.stringify(requirements), assignedDeveloperId, caseId],
      );
      await client.query(
        `INSERT INTO case_audit_events (id, case_id, action, actor_role, actor_id, actor_name, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          auditEntry.id,
          caseId,
          auditEntry.action,
          auditEntry.actor_role,
          auditEntry.actor_id,
          auditEntry.actor_name,
          auditEntry.details,
          auditEntry.timestamp || new Date().toISOString(),
        ],
      );
      await client.query('COMMIT');
      return this.findById(caseId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async addEvidence(id, item, auditEntry) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        'SELECT id, status FROM development_cases WHERE id = $1 OR case_number = $1',
        [id],
      );
      if (!existing.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }
      const caseId = existing.rows[0].id;
      const newStatus =
        existing.rows[0].status === 'MITIGATION_REQUIRED' ? 'EVIDENCE_SUBMITTED' : existing.rows[0].status;

      await client.query(
        `INSERT INTO case_evidence_items (id, case_id, type, file_name, storage_path, uploaded_by, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          item.id,
          caseId,
          item.type,
          item.fileName,
          item.url,
          item.uploadedBy,
          item.status || 'submitted',
          item.uploadedAt || new Date().toISOString(),
        ],
      );
      await client.query(
        `UPDATE development_cases SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, caseId],
      );
      await client.query(
        `INSERT INTO case_audit_events (id, case_id, action, actor_role, actor_id, actor_name, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          auditEntry.id,
          caseId,
          auditEntry.action,
          auditEntry.actor_role,
          auditEntry.actor_id,
          auditEntry.actor_name,
          auditEntry.details,
          auditEntry.timestamp || new Date().toISOString(),
        ],
      );
      await client.query('COMMIT');
      return this.findById(caseId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async verify(id, decision, auditEntry) {
    const status = decision === 'approved' ? 'VERIFIED' : 'REJECTED';
    return this.updateStatus(id, status, auditEntry);
  }

  async getStats() {
    const res = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'AI_FLAGGED')::int AS ai_flagged,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW')::int AS under_review,
        COUNT(*) FILTER (WHERE status = 'MITIGATION_REQUIRED')::int AS mitigation_required,
        COUNT(*) FILTER (WHERE status IN ('EVIDENCE_SUBMITTED', 'AGENCY_PENDING'))::int AS pending_verification,
        COUNT(*) FILTER (WHERE risk->>'overall' = 'HIGH')::int AS high_risk,
        COUNT(*) FILTER (WHERE status IN ('CLOSED', 'VERIFIED'))::int AS closed
      FROM development_cases
    `);
    return res.rows[0];
  }

  getEvidenceDir(caseId) {
    if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const dir = path.join(EVIDENCE_DIR, caseId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}

module.exports = new CaseDbStore();
