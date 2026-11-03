/**
 * Kili-Vault Backend: Server Entry Point
 * Starts HTTP listener on configured port/host, initializes pool, and attaches graceful shutdown handlers.
 */
'use strict';

const app = require('./app');
const config = require('./config');
const db = require('./repositories/db');
const logger = require('./utils/logger');

const server = app.listen(config.PORT, config.HOST, () => {
  logger.info('Kili-Vault Backend server initialized successfully', {
    port: config.PORT,
    host: config.HOST,
    env: config.NODE_ENV,
    version: config.PROCESSING_VERSION,
    aoi: 'Kilimani Ward, Nairobi',
  });
  console.log(`\n>>> Kili-Vault Backend running on http://${config.HOST}:${config.PORT} (v${config.PROCESSING_VERSION}) <<<\n`);
});

// Graceful shutdown handling for container termination (Cloud Run, Docker, Kubernetes)
let isShuttingDown = false;

async function handleGracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Commencing graceful shutdown...`);

  // Stop accepting new HTTP connections
  server.close(async () => {
    logger.info('HTTP server closed. Releasing database connections...');
    try {
      await db.closePool();
      logger.info('All resources released cleanly. Exiting process.');
      process.exit(0);
    } catch (err) {
      logger.error('Error encountered during resource cleanup', { error: err.message });
      process.exit(1);
    }
  });

  // Force shutdown if cleanup exceeds 10 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

module.exports = server;
