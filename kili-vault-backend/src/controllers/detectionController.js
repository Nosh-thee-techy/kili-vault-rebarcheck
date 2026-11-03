/**
 * Kili-Vault: Detection Controller
 * Exposes endpoints for detections, GeoJSON outputs, and aggregate statistics.
 */
'use strict';

const detectionService = require('../services/detectionService');

async function getDetections(req, res, next) {
  try {
    const result = await detectionService.listDetections(req.query);
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

async function getDetectionById(req, res, next) {
  try {
    const detection = await detectionService.getDetectionById(req.params.id);
    res.json({ data: detection });
  } catch (err) {
    next(err);
  }
}

async function getDetectionsGeoJson(req, res, next) {
  try {
    const featureCollection = await detectionService.getDetectionGeoJson(req.query);
    res.json(featureCollection);
  } catch (err) {
    next(err);
  }
}

async function getDetectionStats(req, res, next) {
  try {
    const stats = await detectionService.getStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDetections,
  getDetectionById,
  getDetectionsGeoJson,
  getDetectionStats,
};
