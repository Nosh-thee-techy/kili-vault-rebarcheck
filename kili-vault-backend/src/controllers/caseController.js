"use strict";

const caseService = require("../services/caseService");
const caseRepository = require("../repositories/caseRepository");
const detectionPromotionService = require("../services/detectionPromotionService");
const preDevelopmentService = require("../services/preDevelopmentService");
const propertyRecordService = require("../services/propertyRecordService");
const path = require("path");

async function listCases(req, res, next) {
  try {
    const result = await caseService.listCases(req.query, req.user);
    res.json({
      success: true,
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

async function getCase(req, res, next) {
  try {
    const data = await caseService.getCaseById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPropertyRecord(req, res, next) {
  try {
    const data = await propertyRecordService.getPropertyRecord(
      req.params.id,
      req.user,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getGeoJSON(req, res, next) {
  try {
    const data = await caseService.getGeoJSON(req.query, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const data = await caseService.getStats(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status, note } = req.body;
    const data = await caseService.updateStatus(
      req.params.id,
      status,
      req.user,
      note,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function addMitigation(req, res, next) {
  try {
    const { requirements, assigned_developer_id, assignedDeveloperId } =
      req.body;
    const data = await caseService.addMitigation(
      req.params.id,
      {
        requirements,
        assignedDeveloperId: assignedDeveloperId || assigned_developer_id,
      },
      req.user,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function uploadEvidence(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "File is required" },
      });
    }
    const caseItem = await caseService.getCaseById(req.params.id, req.user);
    const url = `/api/v1/cases/${caseItem.id}/evidence/${req.file.filename}`;
    const data = await caseService.addEvidence(
      caseItem.id,
      {
        fileName: req.file.originalname,
        url,
        type: req.file.mimetype?.startsWith("image/") ? "photo" : "document",
        metadata: parseEvidenceMetadata(req.body),
      },
      req.user,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

function parseEvidenceMetadata(body = {}) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy);
  return {
    source: body.source || "user-upload",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    accuracyM: Number.isFinite(accuracy) ? accuracy : null,
    capturedAt: body.capturedAt || null,
    parcelRef: body.parcelRef || null,
    detectionId: body.detectionId || null,
  };
}

async function serveEvidence(req, res, next) {
  try {
    const filePath = path.join(
      caseRepository.getEvidenceDir(req.params.id),
      req.params.filename,
    );
    res.sendFile(filePath, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    const { decision, note } = req.body;
    const data = await caseService.verify(
      req.params.id,
      decision,
      req.user,
      note,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function promoteDetections(req, res, next) {
  try {
    if (req.user.role !== "planner") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Only planners can promote detections to cases",
        },
      });
    }
    const result = await detectionPromotionService.promoteDetections(
      req.body,
      req.user,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function unpromotedDetectionCount(req, res, next) {
  try {
    const min = req.query.min_confidence
      ? Number(req.query.min_confidence)
      : 0.75;
    const count = await detectionPromotionService.countUnpromoted(min);
    res.json({
      success: true,
      data: { unpromoted: count, min_confidence: min },
    });
  } catch (err) {
    next(err);
  }
}

async function submitObservation(req, res, next) {
  try {
    const data = await caseService.submitObservation(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function previewPreDevelopment(req, res, next) {
  try {
    const data = await preDevelopmentService.preview(req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function submitPreDevelopment(req, res, next) {
  try {
    const data = await preDevelopmentService.submit(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listObservations(req, res, next) {
  try {
    const data = await caseService.listObservations(
      req.user,
      Number(req.query.limit) || 50,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listMyObservations(req, res, next) {
  try {
    const data = await caseService.listMyObservations(
      req.user,
      Number(req.query.limit) || 50,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCases,
  getCase,
  getPropertyRecord,
  getGeoJSON,
  getStats,
  updateStatus,
  addMitigation,
  uploadEvidence,
  serveEvidence,
  verify,
  submitObservation,
  listObservations,
  listMyObservations,
  previewPreDevelopment,
  submitPreDevelopment,
  promoteDetections,
  unpromotedDetectionCount,
};
