/**
 * Kili-Vault: Processing Routes
 * GET /api/v1/processing/runs
 * GET /api/v1/processing/runs/:id
 */
'use strict';

const express = require('express');
const router = express.Router();
const processingController = require('../controllers/processingController');

// GET /api/v1/processing/runs
router.get('/runs', processingController.listRuns);

// GET /api/v1/processing/runs/:id
router.get('/runs/:id', processingController.getRunById);

// Also support base path /api/v1/processing
router.get('/', processingController.listRuns);

module.exports = router;
