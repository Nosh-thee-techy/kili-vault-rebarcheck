#!/usr/bin/env node
/**
 * Kili-Vault stack connectivity report — DB, cases storage, GEE config, Python deps.
 */
'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const db = require('../src/repositories/db');
const caseRepository = require('../src/repositories/caseRepository');
const config = require('../src/config');

const ROOT = path.resolve(__dirname, '..');

function line(label, status, detail = '') {
  const icon = status === 'ok' ? '✓' : status === 'warn' ? '!' : '✗';
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ''}`);
}

async function checkDatabase() {
  const health = await db.checkHealth();
  if (health.status === 'unconfigured') {
    line('PostgreSQL / Supabase', 'fail', 'DATABASE_URL or SUPABASE_DB_URL not set');
    return;
  }
  if (!health.connected) {
    line('PostgreSQL / Supabase', 'fail', health.message);
    return;
  }
  line('PostgreSQL / Supabase', 'ok', `PostGIS ${health.postgis_version || 'enabled'}`);

  try {
    const det = await db.query('SELECT COUNT(*)::int AS n FROM detections');
    line('Detections table', 'ok', `${det.rows[0].n} rows`);
  } catch {
    line('Detections table', 'warn', 'missing — run npm run db:setup');
  }
}

async function checkCases() {
  const info = await caseRepository.getStorageInfo();
  line('Cases storage', info.mode === 'postgres' ? 'ok' : 'warn', info.mode);
}

function checkGeeConfig() {
  const project = config.GEE_PROJECT_ID;
  const email = config.GEE_SERVICE_ACCOUNT_EMAIL;
  const keyPath = config.GEE_SERVICE_ACCOUNT_KEY_PATH;
  const aoi = config.AOI_GEOJSON_PATH || config.GEE_AOI_ASSET;

  if (!project) {
    line('GEE project', 'fail', 'GEE_PROJECT_ID not set');
  } else {
    line('GEE project', 'ok', project);
  }

  if (keyPath && fs.existsSync(path.resolve(ROOT, keyPath))) {
    line('GEE service account key', 'ok', keyPath);
  } else if (email) {
    line('GEE service account', 'warn', `${email} — key file missing or use earthengine authenticate`);
  } else {
    line('GEE credentials', 'fail', 'Set GEE_SERVICE_ACCOUNT_* or run earthengine authenticate');
  }

  const aoiResolved = path.resolve(ROOT, aoi || 'config/kilimani_ward.geojson');
  if (fs.existsSync(aoiResolved)) {
    line('Kilimani AOI', 'ok', path.relative(ROOT, aoiResolved));
  } else {
    line('Kilimani AOI', 'warn', 'AOI file not found');
  }
}

function checkPython() {
  try {
    execSync('python --version', { stdio: 'pipe' });
    line('Python', 'ok');
  } catch {
    line('Python', 'fail', 'python not on PATH');
    return;
  }
  try {
    execSync('python -c "import ee"', { stdio: 'pipe', cwd: ROOT });
    line('earthengine-api', 'ok');
  } catch {
    line('earthengine-api', 'warn', 'pip install -r requirements.txt');
  }
}

function checkSupabaseAuth() {
  if (config.SUPABASE_URL) {
    line('Supabase project URL', 'ok', config.SUPABASE_URL);
  } else {
    line('Supabase Auth (future)', 'warn', 'SUPABASE_URL not set — demo auth still active');
  }
}

async function main() {
  console.log('\n=== Kili-Vault Stack Check ===\n');
  await checkDatabase();
  await checkCases();
  console.log('');
  checkGeeConfig();
  console.log('');
  checkPython();
  console.log('');
  checkSupabaseAuth();
  console.log('\nFull setup guide: docs/CONNECT.md\n');
  await db.closePool();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
