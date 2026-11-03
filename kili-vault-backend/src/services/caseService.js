'use strict';

const { v4: uuidv4 } = require('uuid');
const caseRepository = require('../repositories/caseRepository');
const detectionRepository = require('../repositories/detectionRepository');
const observationRepository = require('../repositories/observationRepository');
const { AppError } = require('../middleware/errorHandler');

const DEFAULT_DEVELOPER_ID = process.env.DEFAULT_DEVELOPER_ID || 'dev_kilimani_001';

function mapDetectionSnapshot(row) {
  if (!row) return null;
  return {
    id: row.id,
    runId: row.run_id,
    changeType: row.change_type,
    confidence: row.confidence,
    baselineProbability: row.baseline_probability,
    prithviProbability: row.prithvi_probability,
    ndbiChange: row.ndbi_change,
    ndviChange: row.ndvi_change,
    temporalPersistence: row.temporal_persistence,
    areaM2: row.area_m2,
    modelVersion: row.model_version,
    evidence: row.evidence,
    createdAt: row.created_at,
  };
}

async function enrichCaseWithDetection(caseItem) {
  if (!caseItem?.detectionId) return caseItem;
  try {
    const detection = await detectionRepository.findById(caseItem.detectionId);
    if (detection) {
      caseItem.linkedDetection = mapDetectionSnapshot(detection);
    }
  } catch {
    // detection may have been removed
  }
  return caseItem;
}

const TRANSITIONS = {
  planner: {
    AI_FLAGGED: ['UNDER_REVIEW', 'CLOSED'],
    UNDER_REVIEW: ['MITIGATION_REQUIRED', 'CLOSED'],
    MITIGATION_REQUIRED: ['UNDER_REVIEW'],
    EVIDENCE_SUBMITTED: ['AGENCY_PENDING'],
    VERIFIED: ['CLOSED'],
    REJECTED: ['MITIGATION_REQUIRED'],
  },
  developer: {
    MITIGATION_REQUIRED: ['EVIDENCE_SUBMITTED'],
  },
  agency: {
    AGENCY_PENDING: ['VERIFIED', 'REJECTED'],
    EVIDENCE_SUBMITTED: ['VERIFIED', 'REJECTED'],
  },
};

function canTransition(role, fromStatus, toStatus) {
  const allowed = TRANSITIONS[role]?.[fromStatus] || [];
  return allowed.includes(toStatus);
}

class CaseService {
  async listCases(query, user) {
    const filters = { ...query };
    if (user.role === 'developer') {
      filters.assigned_developer_id = user.id;
    }
    if (user.role === 'agency') {
      filters.agency_queue = true;
    }
    return caseRepository.findAll(filters);
  }

  async getCaseById(id, user) {
    const caseItem = await caseRepository.findById(id);
    if (!caseItem) {
      throw new AppError('NOT_FOUND', `Case '${id}' not found`, 404);
    }
    if (user.role === 'developer' && caseItem.assignedDeveloperId !== user.id) {
      throw new AppError('FORBIDDEN', 'You do not have access to this case', 403);
    }
    return enrichCaseWithDetection(caseItem);
  }

  async getGeoJSON(query, user) {
    const { data } = await this.listCases(query, user);
    const features = data.map((c) => ({
      type: 'Feature',
      id: c.id,
      geometry: c.geometry,
      properties: {
        id: c.id,
        caseNumber: c.caseNumber,
        changeType: c.changeType,
        status: c.status,
        confidence: c.confidence,
        title: c.title,
      },
    }));
    return { type: 'FeatureCollection', features };
  }

  async getStats(user) {
    if (user.role === 'developer') {
      const { data } = await caseRepository.findAll({ assigned_developer_id: user.id });
      return {
        total: data.length,
        mitigation_required: data.filter((c) => c.status === 'MITIGATION_REQUIRED').length,
        pending_verification: data.filter(
          (c) => c.status === 'EVIDENCE_SUBMITTED' || c.status === 'AGENCY_PENDING',
        ).length,
        closed: data.filter((c) => c.status === 'CLOSED' || c.status === 'VERIFIED').length,
      };
    }
    return caseRepository.getStats();
  }

  async updateStatus(id, status, user, note) {
    const existing = await this.getCaseById(id, user);
    if (!canTransition(user.role, existing.status, status)) {
      throw new AppError(
        'FORBIDDEN',
        `Role '${user.role}' cannot transition from ${existing.status} to ${status}`,
        403,
      );
    }
    const auditEntry = {
      id: uuidv4(),
      action: 'STATUS_CHANGED',
      actor_role: user.role,
      actor_id: user.id,
      actor_name: user.name,
      timestamp: new Date().toISOString(),
      details: note || `${existing.status} → ${status}`,
    };
    return caseRepository.updateStatus(existing.id, status, auditEntry);
  }

  async addMitigation(id, payload, user) {
    const existing = await this.getCaseById(id, user);
    if (user.role !== 'planner') {
      throw new AppError('FORBIDDEN', 'Only planners can create mitigation requirements', 403);
    }
    const requirements = payload.requirements || [];
    const assignedDeveloperId = payload.assignedDeveloperId || DEFAULT_DEVELOPER_ID;
    if (!requirements.length) {
      throw new AppError('VALIDATION_ERROR', 'At least one mitigation requirement is required', 400);
    }
    const auditEntry = {
      id: uuidv4(),
      action: 'MITIGATION_REQUIRED',
      actor_role: user.role,
      actor_id: user.id,
      actor_name: user.name,
      timestamp: new Date().toISOString(),
      details: `${requirements.join('; ')} → assigned to ${assignedDeveloperId}`,
    };
    const updated = await caseRepository.addMitigation(
      existing.id,
      { requirements, assignedDeveloperId },
      auditEntry,
    );
    return enrichCaseWithDetection(updated);
  }

  async addEvidence(id, fileMeta, user) {
    const existing = await this.getCaseById(id, user);
    if (!['developer', 'planner'].includes(user.role)) {
      throw new AppError('FORBIDDEN', 'Cannot upload evidence for this role', 403);
    }
    const item = {
      id: uuidv4(),
      type: fileMeta.type || 'document',
      fileName: fileMeta.fileName,
      url: fileMeta.url,
      uploadedBy: user.name,
      uploadedAt: new Date().toISOString(),
      status: 'submitted',
      metadata: fileMeta.metadata || {},
    };
    const auditEntry = {
      id: uuidv4(),
      action: 'EVIDENCE_SUBMITTED',
      actor_role: user.role,
      actor_id: user.id,
      actor_name: user.name,
      timestamp: new Date().toISOString(),
      details: fileMeta.metadata?.latitude != null
        ? `${fileMeta.fileName} · geotag ${fileMeta.metadata.latitude}, ${fileMeta.metadata.longitude}`
        : fileMeta.fileName,
    };
    return caseRepository.addEvidence(existing.id, item, auditEntry);
  }

  async verify(id, decision, user, note) {
    const existing = await this.getCaseById(id, user);
    if (user.role !== 'agency') {
      throw new AppError('FORBIDDEN', 'Only agency verifiers can approve or reject', 403);
    }
    const newStatus = decision === 'approved' ? 'VERIFIED' : 'REJECTED';
    if (!canTransition('agency', existing.status, newStatus)) {
      throw new AppError('FORBIDDEN', `Cannot verify case in status ${existing.status}`, 403);
    }
    const auditEntry = {
      id: uuidv4(),
      action: decision === 'approved' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
      actor_role: user.role,
      actor_id: user.id,
      actor_name: user.name,
      timestamp: new Date().toISOString(),
      details: note || decision,
    };
    return caseRepository.verify(existing.id, decision, auditEntry);
  }

  async submitObservation(data, user) {
    if (user.role !== 'community') {
      throw new AppError('FORBIDDEN', 'Community role required', 403);
    }
    if (!data.lat || !data.lon || !data.description?.trim()) {
      throw new AppError('VALIDATION_ERROR', 'lat, lon, and description are required', 400);
    }
    return observationRepository.create({
      lat: Number(data.lat),
      lon: Number(data.lon),
      description: data.description.trim(),
      category: data.category || data.report_type || null,
      submittedById: user.id,
      submittedByName: user.name,
    });
  }

  async listMyObservations(user, limit = 50) {
    if (user.role !== 'community') {
      throw new AppError('FORBIDDEN', 'Community role required', 403);
    }
    const observations = await observationRepository.findBySubmitter(user.id, limit);
    const linkedCount = observations.filter((o) => o.status === 'LINKED_TO_CASE').length;
    const pendingCount = observations.filter((o) => o.status === 'PENDING_REVIEW').length;
    return {
      observations,
      total: observations.length,
      pendingCount,
      linkedCount,
    };
  }

  async listObservations(user, limit = 50) {
    if (user.role !== 'planner') {
      throw new AppError('FORBIDDEN', 'Only planners can review community observations', 403);
    }
    const [observations, pendingCount] = await Promise.all([
      observationRepository.findPending(limit),
      observationRepository.countPending(),
    ]);
    return { observations, pendingCount };
  }
}

module.exports = new CaseService();
