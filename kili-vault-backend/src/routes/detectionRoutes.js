/**
 * Kili-Vault: Detection Routes
 * Exposes read-only detection endpoints:
 * GET /api/v1/detections
 * GET /api/v1/detections/geojson
 * GET /api/v1/detections/stats
 * GET /api/v1/detections/:id
 */
'use strict';

const express = require('express');
const router = express.Router();
const detectionController = require('../controllers/detectionController');
const validate = require('../middleware/validate');
const {
  detectionQuerySchema,
  detectionIdParamsSchema,
} = require('../validators/detectionValidator');

// GET /api/v1/detections - Paginated list of detections with spatial & attribute filters
router.get(
  '/',
  validate({ query: detectionQuerySchema }),
  detectionController.getDetections
);

// GET /api/v1/detections/geojson - Direct GeoJSON FeatureCollection output
router.get(
  '/geojson',
  validate({ query: detectionQuerySchema }),
  detectionController.getDetectionsGeoJson
);

// GET /api/v1/detections/stats - Aggregate detection metrics and counts
router.get(
  '/stats',
  detectionController.getDetectionStats
);

// GET /api/v1/detections/:id - Single detection details
router.get(
  '/:id',
  validate({ params: detectionIdParamsSchema }),
  detectionController.getDetectionById
);

module.exports = router;
