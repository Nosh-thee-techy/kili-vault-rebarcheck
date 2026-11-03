'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../repositories/db');
const caseRepository = require('../repositories/caseRepository');
const config = require('../config');

function getGeeStatus() {
  const keyPath = config.GEE_SERVICE_ACCOUNT_KEY_PATH;
  const resolvedKey =
    keyPath && fs.existsSync(path.resolve(process.cwd(), keyPath)) ? keyPath : null;

  return {
    configured: Boolean(config.GEE_PROJECT_ID),
    project_id: config.GEE_PROJECT_ID || null,
    service_account: config.GEE_SERVICE_ACCOUNT_EMAIL || null,
    key_file_present: Boolean(resolvedKey),
    aoi: config.AOI_GEOJSON_PATH || config.GEE_AOI_ASSET || null,
  };
}

function getHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'kili-vault-backend',
    version: config.PROCESSING_VERSION,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
  });
}

function getLive(req, res) {
  res.json({
    status: 'live',
    timestamp: new Date().toISOString(),
  });
}

async function getReady(req, res) {
  const dbHealth = await db.checkHealth();
  const casesStorage = await caseRepository.getStorageInfo();
  const gee = getGeeStatus();

  const isDatabaseReady = dbHealth.connected === true || config.NODE_ENV !== 'production';
  const readinessStatus = isDatabaseReady ? 'ready' : 'degraded';
  const statusCode = isDatabaseReady ? 200 : 503;

  res.status(statusCode).json({
    status: readinessStatus,
    checks: {
      configuration: 'ok',
      database: dbHealth,
      cases_storage: {
        mode: casesStorage.mode,
        database: casesStorage.database.status,
      },
      earth_engine: gee,
      supabase_auth: config.SUPABASE_URL
        ? { configured: true, url: config.SUPABASE_URL }
        : { configured: false, message: 'Demo auth — set SUPABASE_URL for production' },
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getHealth,
  getLive,
  getReady,
};
