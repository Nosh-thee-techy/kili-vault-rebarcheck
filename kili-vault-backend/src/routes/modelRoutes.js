/**
 * Kili-Vault: Model Management & Automation Routes
 */
'use strict';

const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');

router.get('/status', modelController.getStatus);
router.post('/train', modelController.trainModels);
router.post('/verify', modelController.verifyModels);
router.post('/pipeline/auto', modelController.runPipeline);

module.exports = router;
