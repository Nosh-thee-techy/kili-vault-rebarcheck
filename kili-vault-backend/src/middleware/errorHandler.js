/**
 * Kili-Vault Backend: Centralized Error Handling Middleware
 * Ensures all API errors adhere strictly to the standardized error schema:
 * {
 *   "error": {
 *     "code": "...",
 *     "message": "...",
 *     "details": {}
 *   }
 * }
 */
'use strict';

const logger = require('../utils/logger');
const config = require('../config');

// Custom Application Error
class AppError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function errorHandlerMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
  const correlationId = req.id || 'unknown';
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected internal server error occurred';
  const details = err.details || {};

  // Log full stack trace server-side with correlation id
  logger.error('API Error Encountered', {
    request_id: correlationId,
    code,
    statusCode,
    message,
    stack: err.stack,
    path: req.originalUrl || req.url,
    method: req.method,
  });

  // Never leak internal stack traces or database connection details in production
  const safeMessage = (statusCode === 500 && config.NODE_ENV === 'production')
    ? 'An unexpected internal server error occurred'
    : message;

  res.status(statusCode).json({
    error: {
      code,
      message: safeMessage,
      details,
      correlation_id: correlationId,
    },
  });
}

module.exports = {
  AppError,
  errorHandlerMiddleware,
};
