/**
 * Kili-Vault: Detection Service
 * Manages spatial change detections, GeoJSON generation, and statistical summaries.
 */
'use strict';

const detectionRepository = require('../repositories/detectionRepository');
const { toFeatureCollection, parseBboxString } = require('../utils/geoUtils');
const { AppError } = require('../middleware/errorHandler');

class DetectionService {
  async listDetections(query = {}) {
    const filters = { ...query };
    if (query.bbox) {
      filters.bbox = parseBboxString(query.bbox);
    }
    return await detectionRepository.findAll(filters);
  }

  async getDetectionById(id) {
    const detection = await detectionRepository.findById(id);
    if (!detection) {
      throw new AppError('NOT_FOUND', `Detection with ID '${id}' was not found`, 404);
    }
    return detection;
  }

  async getDetectionGeoJson(query = {}) {
    const { data } = await this.listDetections(query);
    return toFeatureCollection(data, 'geometry', 'id');
  }

  async getStats() {
    return await detectionRepository.getStats();
  }
}

module.exports = new DetectionService();
