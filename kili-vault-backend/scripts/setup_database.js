#!/usr/bin/env node
/**
 * Apply PostGIS schemas and migrate JSON cases into Supabase/PostgreSQL.
 *
 * Usage:
 *   node scripts/setup_database.js [--skip-migrate] [--force-migrate]
 *
 * Requires DATABASE_URL or SUPABASE_DB_URL in .env
 */
'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/repositories/db');
const logger = require('../src/utils/logger');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_FILES = [
  path.join(ROOT, 'database/schema.sql'),
  path.join(ROOT, 'database/schema_cases.sql'),
  path.join(ROOT, 'database/schema_observations.sql'),
];
const CASES_JSON = path.join(ROOT, 'data/development_cases.json');

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  logger.info(`[db:setup] Applying ${path.basename(filePath)}`);
  await db.query(sql);
}

async function migrateCases(force = false) {
  if (!fs.existsSync(CASES_JSON)) {
    logger.warn('[db:setup] No development_cases.json to migrate');
    return 0;
  }

  const store = JSON.parse(fs.readFileSync(CASES_JSON, 'utf8'));
  const cases = store.cases || [];
  let inserted = 0;

  for (const row of cases) {
    const exists = await db.query('SELECT id FROM development_cases WHERE id = $1', [row.id]);
    if (exists.rows.length && !force) continue;

    if (exists.rows.length && force) {
      await db.query('DELETE FROM development_cases WHERE id = $1', [row.id]);
    }

    let detectionId = row.detection_id ?? null;
    if (detectionId) {
      const det = await db.query('SELECT id FROM detections WHERE id = $1', [detectionId]);
      if (!det.rows.length) detectionId = null;
    }

    await db.query(
      `INSERT INTO development_cases (
         id, case_number, detection_id, title, change_type, status, confidence,
         risk, area_m2, centroid_lat, centroid_lon, geometry, evidence,
         parcel_ref, assigned_developer_id, mitigation_requirements, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8::jsonb, $9, $10, $11, ST_SetSRID(ST_GeomFromGeoJSON($12), 4326), $13::jsonb,
         $14, $15, $16::jsonb, $17, $18
       )`,
      [
        row.id,
        row.case_number,
        detectionId,
        row.title,
        row.change_type,
        row.status,
        row.confidence,
        JSON.stringify(row.risk || {}),
        row.area_m2,
        row.centroid_lat,
        row.centroid_lon,
        JSON.stringify(row.geometry),
        JSON.stringify(row.evidence || {}),
        row.parcel_ref,
        row.assigned_developer_id,
        JSON.stringify(row.mitigation_requirements || []),
        row.created_at,
        row.updated_at,
      ],
    );

    for (const event of row.audit_events || []) {
      await db.query(
        `INSERT INTO case_audit_events (id, case_id, action, actor_role, actor_id, actor_name, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          event.id,
          row.id,
          event.action,
          event.actor_role,
          event.actor_id,
          event.actor_name,
          event.details,
          event.timestamp || event.created_at,
        ],
      );
    }

    inserted++;
  }

  return inserted;
}

async function main() {
  const skipMigrate = process.argv.includes('--skip-migrate');
  const forceMigrate = process.argv.includes('--force-migrate');

  const health = await db.checkHealth();
  if (!health.connected) {
    console.error('\n❌ Database not configured or unreachable.');
    console.error('   Set DATABASE_URL or SUPABASE_DB_URL in kili-vault-backend/.env\n');
    console.error('   See docs/CONNECT.md for Supabase connection string format.\n');
    process.exit(1);
  }

  console.log('\n✓ Database connected');
  console.log(`  PostGIS: ${health.postgis_version || 'unknown'}\n`);

  for (const file of SCHEMA_FILES) {
    if (!fs.existsSync(file)) {
      throw new Error(`Schema file missing: ${file}`);
    }
    await runSqlFile(file);
  }
  console.log('✓ Schemas applied (detections + development_cases)\n');

  if (!skipMigrate) {
    const count = await migrateCases(forceMigrate);
    console.log(`✓ Migrated ${count} development case(s) from JSON\n`);
  }

  console.log('Next: restart backend — cases will auto-switch to PostgreSQL.\n');
  await db.closePool();
}

main().catch((err) => {
  logger.error('[db:setup] Failed', { error: err.message, stack: err.stack });
  console.error('\n❌ Setup failed:', err.message, '\n');
  process.exit(1);
});
