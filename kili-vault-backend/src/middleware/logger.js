/**
 * Kili-Vault Backend: Request Logging Middleware
 * Records incoming HTTP operations with duration, status, and correlation ID.
 */
'use strict';

const logger = require('../utils/logger');

function requestLoggerMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      request_id: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers['user-agent'],
    });
  });

  next();
}

module.exports = requestLoggerMiddleware;
