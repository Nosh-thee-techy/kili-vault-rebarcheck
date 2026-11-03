/**
 * RebarCheck HTTP handlers: submit a photo and list GeoJSON pins.
 */

"use strict";

const rebarCheckService = require("../services/rebarCheckService");
const { AppError } = require("../middleware/errorHandler");

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/jpg"]);
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/v1/cases/:id/evidence/rebar-check
 */
async function submitRebarCheck(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError("VALIDATION_ERROR", "File is required", 400);
    }
    if (!ALLOWED_MIME.has(req.file.mimetype)) {
      throw new AppError("VALIDATION_ERROR", "Only JPEG and PNG images are accepted", 400);
    }
    if (req.file.size > MAX_BYTES) {
      throw new AppError("VALIDATION_ERROR", "Image must be 10 MB or smaller", 400);
    }
    const result = await rebarCheckService.analyzeAndStore(
      {
        caseId: req.params.id,
        storedFilePath: req.file.path,
        storedFileName: req.file.filename,
        originalFileName: req.file.originalname,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        accuracy: req.body.accuracy,
        capturedAt: req.body.capturedAt,
        parcelRef: req.body.parcelRef,
        specSpacingMm: req.body.specSpacingMm,
        toleranceMm: req.body.toleranceMm,
        referenceType: req.body.referenceType,
        referenceLengthMm: req.body.referenceLengthMm,
        mmPerPixel: req.body.mmPerPixel,
        submitter: req.body.submitter,
        channel: req.body.channel || "web",
        segmenter: req.body.segmenter || process.env.REBARCHECK_SEGMENTER,
      },
      req.user,
    );
    res.status(201).json({
      success: true,
      data: {
        evidenceItem: result.evidenceItem,
        rebarCheck: result.rebarCheck,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/rebar-checks/geojson
 */
async function getGeoJSON(req, res, next) {
  try {
    const data = await rebarCheckService.getGeoJSON();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitRebarCheck,
  getGeoJSON,
};
