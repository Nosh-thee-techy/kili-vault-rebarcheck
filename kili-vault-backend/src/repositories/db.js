/**
 * Kili-Vault Backend: PostgreSQL / PostGIS Database Client
 * Manages connection pooling, parameterization, transaction support, and health checks.
 */
"use strict";

const { Pool } = require("pg");
const config = require("../config");
const logger = require("../utils/logger");

let pool = null;
let isConnected = false;

/**
 * Initializes or returns the PostgreSQL connection pool.
 */
function getPool() {
  const connectionString = config.DATABASE_URL || config.SUPABASE_DB_URL;
  if (!pool && connectionString) {
    try {
      pool = new Pool({
        connectionString,
        min: config.DB_POOL_MIN,
        max: config.DB_POOL_MAX,
        connectionTimeoutMillis: config.DB_TIMEOUT_MS,
        idleTimeoutMillis: 30000,
      });

      pool.on("error", (err) => {
        logger.error("Unexpected error on idle PostgreSQL client", {
          error: err.message,
        });
      });

      pool.on("connect", () => {
        isConnected = true;
      });
    } catch (err) {
      logger.error("Failed to initialize PostgreSQL pool", {
        error: err.message,
      });
    }
  }
  return pool;
}

/**
 * Executes a parameterized SQL query.
 * Strictly uses parameterization to prevent SQL injection.
 * @param {string} text - SQL query string with $1, $2 placeholders
 * @param {Array} params - Array of parameter values
 */
async function query(text, params = []) {
  const activePool = getPool();
  if (!activePool) {
    throw new Error("Database connection pool is not configured");
  }

  const start = Date.now();
  try {
    const res = await activePool.query(text, params);
    const duration = Date.now() - start;
    logger.debug("Executed query", {
      text: text.substring(0, 100),
      duration_ms: duration,
      rows: res.rowCount,
    });
    return res;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error("Database query error", {
      error: err.message,
      text: text.substring(0, 150),
      duration_ms: duration,
    });
    throw err;
  }
}

/**
 * Obtains a client from the pool for multi-statement transactions.
 */
async function getClient() {
  const activePool = getPool();
  if (!activePool) {
    throw new Error("Database connection pool is not configured");
  }
  return await activePool.connect();
}

/**
 * Verifies database connectivity and PostGIS extension status.
 * Used by /health/ready check.
 */
async function checkHealth() {
  try {
    const activePool = getPool();
    if (!activePool) {
      return {
        status: "unconfigured",
        message: "DATABASE_URL or SUPABASE_DB_URL is not set",
      };
    }

    const client = await activePool.connect();
    try {
      // Test basic connection + PostGIS version
      const postgisCheck = await client.query(
        "SELECT PostGIS_Version() AS postgis_version;",
      );
      return {
        status: "ok",
        connected: true,
        postgis_version: postgisCheck.rows[0]?.postgis_version || "unknown",
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      status: "error",
      connected: false,
      message: err.message,
    };
  }
}

/**
 * Cleanly closes all pooled database connections on shutdown.
 */
async function closePool() {
  if (pool) {
    logger.info("Closing PostgreSQL connection pool...");
    await pool.end();
    pool = null;
    isConnected = false;
    logger.info("PostgreSQL connection pool closed");
  }
}

module.exports = {
  query,
  getClient,
  getPool,
  checkHealth,
  closePool,
};
