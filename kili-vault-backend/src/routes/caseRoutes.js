'use strict';

const express = require('express');
const multer = require('multer');
const caseController = require('../controllers/caseController');
const caseRepository = require('../repositories/caseRepository');
const { devAuthMiddleware } = require('../middleware/devAuth');

const router = express.Router();
router.use(devAuthMiddleware);

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    cb(null, caseRepository.getEvidenceDir(req.params.id));
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/stats', caseController.getStats);
router.get('/geojson', caseController.getGeoJSON);
router.get('/unpromoted-detections', caseController.unpromotedDetectionCount);
router.post('/promote-detections', caseController.promoteDetections);
router.get('/observations', caseController.listObservations);
router.post('/observations', caseController.submitObservation);
router.get('/', caseController.listCases);
router.get('/:id/evidence/:filename', caseController.serveEvidence);
router.get('/:id', caseController.getCase);
router.patch('/:id/status', caseController.updateStatus);
router.post('/:id/mitigation', caseController.addMitigation);
router.post('/:id/evidence', upload.single('file'), caseController.uploadEvidence);
router.post('/:id/verify', caseController.verify);

module.exports = router;
