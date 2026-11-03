/**
 * Kili-Vault Backend: Health Check Controller
 * Implements /health, /health/live, and /health/ready endpoints for orchestrators and uptime checks.
 */
'use strict';

const db = require('../repositories/db');
const config = require('../config');

/**
 * Standard health summary.
 */
function getHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'kili-vault-backend',
    version: config.PROCESSING_VERSION,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
  });
}

/**
 * Liveness probe for Kubernetes / Cloud Run.
 * Lightweight check confirming the process is alive and responsive.
 */
function getLive(req, res) {
  res.json({
    status: 'live',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Readiness probe.
 * Verifies that critical dependencies (database connection, configuration) are operational.
 */
async function getReady(req, res) {
  const dbHealth = await db.checkHealth();

  const isDatabaseReady = dbHealth.connected === true || config.NODE_ENV !== 'production';

  const readinessStatus = isDatabaseReady ? 'ready' : 'degraded';
  const statusCode = isDatabaseReady ? 200 : 503;

  res.status(statusCode).json({
    status: readinessStatus,
    checks: {
      configuration: 'ok',
      database: dbHealth,
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getHealth,
  getLive,
  getReady,
};
