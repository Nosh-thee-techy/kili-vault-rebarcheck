/**
 * Kili-Vault Backend: Request ID Correlation Middleware
 */
'use strict';

const { v4: uuidv4 } = require('uuid');

function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  req.id = incomingId && typeof incomingId === 'string' ? incomingId : uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

module.exports = requestIdMiddleware;
