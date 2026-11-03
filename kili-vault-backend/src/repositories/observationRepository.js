"use strict";

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");
const caseRepository = require("./caseRepository");
const logger = require("../utils/logger");

const FILE_PATH = path.resolve(
  __dirname,
  "../../data/community_observations.json",
);

function readFileStore() {
  if (!fs.existsSync(FILE_PATH)) {
    return { observations: [] };
  }
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
}

function writeFileStore(data) {
  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

function mapRow(row) {
  return {
    id: row.id,
    lat: Number(row.lat ?? row.latitude),
    lon: Number(row.lon ?? row.longitude),
    description: row.description,
    category: row.category ?? null,
    status: row.status,
    submittedById: row.submitted_by_id,
    submittedByName: row.submitted_by_name,
    caseId: row.case_id,
    createdAt: row.created_at,
  };
}

class ObservationRepository {
  async create(data) {
    const mode = await caseRepository.detectStorageMode();
    const record = {
      id: uuidv4(),
      lat: data.lat,
      lon: data.lon,
      description: data.description,
      status: "PENDING_REVIEW",
      submitted_by_id: data.submittedById,
      submitted_by_name: data.submittedByName,
      case_id: null,
      category: data.category || null,
      created_at: new Date().toISOString(),
    };

    if (mode === "postgres") {
      try {
        const res = await db.query(
          `INSERT INTO community_observations
             (id, latitude, longitude, geometry, description, observation_type,
              submitted_by, submitter_name, status, photo_url, linked_case_id,
              lat, lon, category, submitted_by_id, submitted_by_name, case_id, created_at)
           VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4, $5,
                   $7, $8, $6, NULL, $9, $2, $3, $5, $7, $8, $9, $10)
           RETURNING *`,
          [
            record.id,
            record.lat,
            record.lon,
            record.description,
            record.category,
            record.status,
            record.submitted_by_id,
            record.submitted_by_name,
            record.case_id,
            record.created_at,
          ],
        );
        return mapRow(res.rows[0]);
      } catch (err) {
        if (err.message?.includes("community_observations")) {
          logger.warn("[observations] Table missing — run npm run db:setup");
        }
        throw err;
      }
    }

    const store = readFileStore();
    store.observations.unshift(record);
    writeFileStore(store);
    return mapRow(record);
  }

  async findPending(limit = 50) {
    const mode = await caseRepository.detectStorageMode();

    if (mode === "postgres") {
      const res = await db.query(
        `SELECT * FROM community_observations
         WHERE status = 'PENDING_REVIEW'
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );
      return res.rows.map(mapRow);
    }

    const store = readFileStore();
    return store.observations
      .filter((o) => o.status === "PENDING_REVIEW")
      .slice(0, limit)
      .map(mapRow);
  }

  async findBySubmitter(submittedById, limit = 50) {
    const mode = await caseRepository.detectStorageMode();

    if (mode === "postgres") {
      const res = await db.query(
        `SELECT * FROM community_observations
         WHERE submitted_by_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [submittedById, limit],
      );
      return res.rows.map(mapRow);
    }

    const store = readFileStore();
    return store.observations
      .filter((o) => o.submitted_by_id === submittedById)
      .slice(0, limit)
      .map(mapRow);
  }

  async countPending() {
    const mode = await caseRepository.detectStorageMode();

    if (mode === "postgres") {
      const res = await db.query(
        `SELECT COUNT(*)::int AS n FROM community_observations WHERE status = 'PENDING_REVIEW'`,
      );
      return res.rows[0].n;
    }

    const store = readFileStore();
    return store.observations.filter((o) => o.status === "PENDING_REVIEW")
      .length;
  }
}

module.exports = new ObservationRepository();
