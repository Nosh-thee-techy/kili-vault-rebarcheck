/**
 * Kili-Vault Backend: Structured Logger
 * Emits JSON-structured log entries with timestamp, level, correlation IDs, and contextual metadata.
 */
'use strict';

const levels = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const currentThreshold = levels[currentLevel] || levels.info;

function formatLog(level, message, meta = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...meta,
  };
  return JSON.stringify(logEntry);
}

const logger = {
  debug(message, meta) {
    if (levels.debug >= currentThreshold) {
      console.debug(formatLog('debug', message, meta));
    }
  },
  info(message, meta) {
    if (levels.info >= currentThreshold) {
      console.info(formatLog('info', message, meta));
    }
  },
  warn(message, meta) {
    if (levels.warn >= currentThreshold) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  error(message, meta) {
    if (levels.error >= currentThreshold) {
      console.error(formatLog('error', message, meta));
    }
  },
};

module.exports = logger;
