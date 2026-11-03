/**
 * Kili-Vault: Processing Service
 * Manages Earth Observation Sentinel-2 processing runs and execution provenance.
 */
'use strict';

const processingRunRepository = require('../repositories/processingRunRepository');
const { AppError } = require('../middleware/errorHandler');

class ProcessingService {
  async listRuns(limit = 20, offset = 0) {
    return await processingRunRepository.findAll(limit, offset);
  }

  async getRunById(id) {
    const run = await processingRunRepository.findById(id);
    if (!run) {
      throw new AppError('NOT_FOUND', `Processing run '${id}' not found`, 404);
    }
    return run;
  }
}

module.exports = new ProcessingService();
