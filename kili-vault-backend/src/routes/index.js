/**
 * Kili-Vault: Root v1 API Router
 * Strictly limited to detection and processing engine endpoints.
 */
'use strict';

const express = require('express');
const router = express.Router();

const detectionRoutes = require('./detectionRoutes');
const processingRoutes = require('./processingRoutes');
const modelRoutes = require('./modelRoutes');
const caseRoutes = require('./caseRoutes');

router.use('/cases', caseRoutes);
router.use('/detections', detectionRoutes);
router.use('/processing', processingRoutes);
router.use('/models', modelRoutes);

module.exports = router;
