'use strict';

/**
 * Unified case storage — PostgreSQL when configured + migrated, else JSON file store.
 */
const db = require('./db');
const fileStore = require('./caseStore');
const dbStore = require('./caseDbStore');
const logger = require('../utils/logger');

let storageMode = null;

async function detectStorageMode(force = false) {
  if (storageMode && !force) return storageMode;

  const health = await db.checkHealth();
  if (!health.connected) {
    storageMode = 'file';
    logger.info('[cases] Using file store (database not configured or unreachable)');
    return storageMode;
  }

  try {
    await db.query('SELECT 1 FROM development_cases LIMIT 1');
    storageMode = 'postgres';
    logger.info('[cases] Using PostgreSQL store (Supabase/PostGIS)');
    return storageMode;
  } catch (err) {
    storageMode = 'file';
    logger.warn('[cases] Database connected but development_cases missing — using file store', {
      hint: 'Run: npm run db:setup',
      error: err.message,
    });
    return storageMode;
  }
}

function wrapSync(name, fn) {
  return async (...args) => {
    const mode = await detectStorageMode();
    if (mode === 'postgres') {
      return dbStore[name](...args);
    }
    return fn(...args);
  };
}

module.exports = {
  detectStorageMode,
  async getStorageInfo() {
    const mode = await detectStorageMode();
    const dbHealth = await db.checkHealth();
    return {
      mode,
      database: dbHealth,
    };
  },
  findAll: wrapSync('findAll', (filters) => fileStore.findAll(filters)),
  findById: wrapSync('findById', (id) => fileStore.findById(id)),
  updateStatus: wrapSync('updateStatus', (id, status, audit) =>
    fileStore.updateStatus(id, status, audit),
  ),
  addMitigation: wrapSync('addMitigation', (id, req, audit) =>
    fileStore.addMitigation(id, req, audit),
  ),
  addEvidence: wrapSync('addEvidence', (id, item, audit) =>
    fileStore.addEvidence(id, item, audit),
  ),
  verify: wrapSync('verify', (id, decision, audit) => fileStore.verify(id, decision, audit)),
  getStats: wrapSync('getStats', () => fileStore.getStats()),
  getEvidenceDir: (caseId) => fileStore.getEvidenceDir(caseId),
  createPreDevelopment: async (input, assessment, user) => {
    const mode = await detectStorageMode();
    if (mode === 'postgres') {
      throw new Error('createPreDevelopment should use preDevelopmentService for postgres');
    }
    return fileStore.createPreDevelopment(input, assessment, user);
  },
  resetModeCache: () => {
    storageMode = null;
  },
};
