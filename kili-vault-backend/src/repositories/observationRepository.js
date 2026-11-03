"use strict";

const db = require("./db");

function mapObservation(row) {
  return {
    id: row.id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    description: row.description,
    observationType: row.observation_type,
    submittedBy: row.submitted_by,
    submitterName: row.submitter_name,
    status: row.status,
    photoUrl: row.photo_url,
    reviewNotes: row.review_notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    linkedDetectionId: row.linked_detection_id,
    linkedCaseId: row.linked_case_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT id, latitude, longitude, description, observation_type,
    submitted_by, submitter_name, status, photo_url, review_notes,
    reviewed_by, reviewed_at, linked_detection_id, linked_case_id,
    created_at, updated_at
  FROM community_observations
`;

class ObservationRepository {
  async create(data, actor) {
    const result = await db.query(
      `INSERT INTO community_observations
        (latitude, longitude, geometry, description, observation_type, submitted_by, submitter_name, photo_url)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($2, $1), 4326), $3, $4, $5, $6, $7)
       RETURNING id, latitude, longitude, description, observation_type, submitted_by,
         submitter_name, status, photo_url, review_notes, reviewed_by, reviewed_at,
         linked_detection_id, linked_case_id, created_at, updated_at`,
      [data.latitude, data.longitude, data.description, data.observation_type || null,
        actor.id, actor.name, data.photo_url || null],
    );
    return mapObservation(result.rows[0]);
  }

  async findAll({ status, limit = 50, offset = 0 } = {}) {
    const params = [];
    let where = "";
    if (status) {
      params.push(status);
      where = "WHERE status = $1";
    }
    const count = await db.query(`SELECT COUNT(*)::int AS total FROM community_observations ${where}`, params);
    const rows = await db.query(
      `${SELECT} ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    return { data: rows.rows.map(mapObservation), total: count.rows[0].total, limit, offset };
  }

  async findById(id) {
    const result = await db.query(`${SELECT} WHERE id = $1`, [id]);
    return result.rows[0] ? mapObservation(result.rows[0]) : null;
  }

  async review(id, data, actor) {
    const result = await db.query(
      `UPDATE community_observations
       SET status = $2, review_notes = $3, reviewed_by = $4, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, latitude, longitude, description, observation_type, submitted_by,
         submitter_name, status, photo_url, review_notes, reviewed_by, reviewed_at,
         linked_detection_id, linked_case_id, created_at, updated_at`,
      [id, data.status, data.review_notes || null, actor.id],
    );
    return result.rows[0] ? mapObservation(result.rows[0]) : null;
  }
}

module.exports = new ObservationRepository();