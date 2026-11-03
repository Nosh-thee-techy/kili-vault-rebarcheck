"use strict";

const caseRepository = require("../repositories/caseRepository");
const detectionRepository = require("../repositories/detectionRepository");
const { AppError } = require("../middleware/errorHandler");

function latestEvent(events, action) {
  return (events || []).find((event) => event.action === action) || null;
}

function eventValue(event, key) {
  return event ? (event[key] ?? null) : null;
}

function scenarioFromEvidence(evidence) {
  if (!evidence?.preDevelopment) return null;
  const floors = Number(evidence.proposedFloors);
  const coveragePercent = Number(evidence.coveragePercent);
  return {
    recordedAt: evidence.assessedAt || null,
    footprintAreaM2: null,
    floors: Number.isFinite(floors) ? floors : null,
    units: null,
    occupancy: null,
    floorAreaM2: null,
    coveragePercent: Number.isFinite(coveragePercent) ? coveragePercent : null,
    assumptions: [
      evidence.description || null,
      evidence.disclaimer || null,
    ].filter(Boolean),
    source: "Pre-development assessment evidence",
  };
}

async function getPropertyRecord(id, user) {
  const caseItem = await caseRepository.findById(id);
  if (!caseItem) throw new AppError("NOT_FOUND", `Case '${id}' not found`, 404);
  if (user.role === "developer" && caseItem.assignedDeveloperId !== user.id) {
    throw new AppError("FORBIDDEN", "You do not have access to this case", 403);
  }
  if (caseItem.status !== "CLOSED") {
    throw new AppError(
      "RECORD_UNAVAILABLE",
      "Property Development Record is available after case closure",
      409,
    );
  }

  let detection = null;
  if (caseItem.detectionId) {
    try {
      detection = await detectionRepository.findById(caseItem.detectionId);
    } catch {
      detection = null;
    }
  }

  const closedEvent =
    latestEvent(caseItem.auditEvents, "STATUS_CHANGED") &&
    caseItem.auditEvents.find(
      (event) =>
        event.action === "STATUS_CHANGED" && event.details?.includes("CLOSED"),
    );
  const verificationEvent =
    caseItem.auditEvents?.find(
      (event) =>
        event.action === "VERIFICATION_APPROVED" ||
        event.action === "VERIFICATION_REJECTED",
    ) || null;
  const proposed = scenarioFromEvidence(caseItem.evidence);

  return {
    recordId: `property-record-${caseItem.id}`,
    caseId: caseItem.id,
    caseNumber: caseItem.caseNumber,
    status: caseItem.status,
    closedAt: eventValue(closedEvent, "timestamp") || caseItem.updatedAt,
    property: {
      parcelId: caseItem.parcelRef || null,
      ward: "Kilimani Ward",
      constituency: "Dagoretti Constituency",
      location:
        caseItem.centroidLat != null && caseItem.centroidLon != null
          ? { latitude: caseItem.centroidLat, longitude: caseItem.centroidLon }
          : null,
      landUse: null,
      geometryReference: caseItem.geometry ? "Closed case geometry" : null,
      developmentType: caseItem.changeType || null,
    },
    lifecycle: (caseItem.auditEvents || [])
      .slice()
      .reverse()
      .map((event) => ({
        stage: event.action,
        timestamp: event.timestamp,
        actor: event.actorName || event.actorRole || null,
        details: event.details || null,
      })),
    development: {
      existing: {
        footprintAreaM2: null,
        buildingCount: null,
        openSurfaceM2: null,
        source: "Existing building geometry was not persisted with this case",
      },
      proposed,
      mitigated: null,
      observed: detection
        ? {
            detectionId: detection.id,
            detectedAt: detection.created_at || null,
            changeType: detection.change_type || null,
            geometry: detection.geometry || null,
            areaM2: detection.area_m2 ?? null,
            confidence: detection.confidence ?? null,
            source: detection.model_version || "Detection engine",
          }
        : null,
    },
    comparison:
      proposed && detection
        ? {
            status: "Available for spatial review",
            basis:
              "Proposed scenario and observed detection are both present; exact construction measurement is not asserted.",
            proposedGeometry: null,
            observedGeometry: detection.geometry || null,
          }
        : null,
    spatialContext: {
      caseGeometry: caseItem.geometry || null,
      landUse: null,
      roadProximity: null,
      riverProximity: null,
      riverBufferInteraction: null,
      source:
        "Case geometry and linked detection; parcel context was not persisted with this case",
    },
    verification: {
      status: verificationEvent?.action || "Not recorded",
      verifiedAt: verificationEvent?.timestamp || null,
      reviewer: verificationEvent?.actorName || null,
      notes: verificationEvent?.details || null,
      closureReason: closedEvent?.details || null,
    },
    evidence: (caseItem.evidenceItems || []).map((item) => ({
      id: item.id,
      type: item.type,
      name: item.fileName,
      reference: item.url,
      uploadedAt: item.uploadedAt,
      status: item.status,
    })),
    provenance: {
      case: "Development case workflow",
      proposed: proposed?.source || "No persisted proposed scenario",
      observed: detection
        ? "Linked detection engine record"
        : "No linked detection available",
      verification: verificationEvent ? "Case audit event" : "Not recorded",
    },
    limitations: [
      "This record supports authorized review and does not determine value, lending, insurance, approval, or legal status.",
      "Missing parcel, scenario, spatial proximity, and evidence values are not inferred.",
    ],
  };
}

module.exports = { getPropertyRecord };
