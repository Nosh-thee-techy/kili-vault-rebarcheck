/**
 * Kili-Vault: Processing Controller
 * Handles requests for Earth Observation processing run status and execution metadata.
 */
'use strict';

const processingService = require('../services/processingService');

async function listRuns(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const result = await processingService.listRuns(limit, offset);
    res.json({
      data: result.data,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getRunById(req, res, next) {
  try {
    const run = await processingService.getRunById(req.params.id);
    res.json({ data: run });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRuns,
  getRunById,
};
