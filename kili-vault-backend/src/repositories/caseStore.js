/**
 * Kili-Vault: File-backed Development Case Store
 * Persists cases, audit events, and evidence metadata when PostGIS case tables are unavailable.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'development_cases.json');
const EVIDENCE_DIR = path.join(DATA_DIR, 'evidence');

const STATUSES = [
  'AI_FLAGGED',
  'UNDER_REVIEW',
  'MITIGATION_REQUIRED',
  'EVIDENCE_SUBMITTED',
  'AGENCY_PENDING',
  'VERIFIED',
  'REJECTED',
  'CLOSED',
];

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function buildRisk(confidence, changeType) {
  const base = Math.round(confidence * 100);
  const planning = Math.min(100, base + (changeType === 'BUILDING_DEVELOPMENT' ? 8 : 0));
  const infrastructure = Math.min(
    100,
    base + (changeType === 'INFRASTRUCTURE_CHANGE' ? 12 : 4),
  );
  const environmental = Math.min(100, base - 10);
  const community = Math.min(100, Math.round((planning + infrastructure) / 2 - 5));
  let overall = 'LOW';
  if (confidence >= 0.8 && ['INFRASTRUCTURE_CHANGE', 'BUILDING_DEVELOPMENT'].includes(changeType)) {
    overall = 'HIGH';
  } else if (confidence >= 0.65) overall = 'MEDIUM';
  return { planning, infrastructure, environmental, community, overall };
}

function seedCases() {
  const types = [
    'BUILDING_DEVELOPMENT',
    'INFRASTRUCTURE_CHANGE',
    'LAND_CLEARING',
    'BUILDING_DEVELOPMENT',
    'VEGETATION_CHANGE',
    'SURFACE_CHANGE',
    'BUILDING_DEVELOPMENT',
    'INFRASTRUCTURE_CHANGE',
  ];
  const statuses = [
    'AI_FLAGGED',
    'UNDER_REVIEW',
    'MITIGATION_REQUIRED',
    'EVIDENCE_SUBMITTED',
    'AGENCY_PENDING',
    'VERIFIED',
    'CLOSED',
    'AI_FLAGGED',
  ];
  const baseLat = -1.2921;
  const baseLon = 36.782;

  return types.map((changeType, index) => {
    const lat = baseLat - Math.floor(index / 4) * 0.002 + (index % 4 - 1.5) * 0.0015;
    const lon = baseLon + (index % 4) * 0.002 - Math.floor(index / 4) * 0.001;
    const confidence = 0.62 + (index % 5) * 0.07;
    const d = 0.0002;
    const id = `case_${uuidv4().slice(0, 8)}`;
    const now = new Date(Date.now() - index * 86400000 * 2).toISOString();

    return {
      id,
      case_number: `KV-${String(10127 + index).padStart(5, '0')}`,
      detection_id: `det_mock_${index}`,
      title: `Potential ${changeType.replace(/_/g, ' ').toLowerCase()} near ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      change_type: changeType,
      status: statuses[index],
      confidence,
      risk: buildRisk(confidence, changeType),
      area_m2: 380 + index * 120,
      centroid_lat: lat,
      centroid_lon: lon,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [lon - d, lat - d],
            [lon + d, lat - d],
            [lon + d, lat + d],
            [lon - d, lat + d],
            [lon - d, lat - d],
          ],
        ],
      },
      evidence: {
        explanation:
          'Spectral differencing indicates physical surface change between baseline and recent composites.',
        spectral_change: true,
      },
      parcel_ref: `KL-${1200 + index}`,
      assigned_developer_id: index % 2 === 0 ? 'dev_kilimani_001' : 'dev_kilimani_002',
      mitigation_requirements: index >= 2 ? ['Infrastructure assessment required', 'NCWSC verification'] : [],
      audit_events: [
        {
          id: uuidv4(),
          action: 'CASE_CREATED',
          actor_role: 'system',
          actor_id: 'kili-shadows',
          actor_name: 'Kili-Shadows',
          timestamp: now,
          details: 'Detection promoted to development case',
        },
      ],
      evidence_items: [],
      created_at: now,
      updated_at: new Date(Date.now() - index * 3600000).toISOString(),
    };
  });
}

function readStore() {
  ensureDirs();
  if (!fs.existsSync(STORE_PATH)) {
    const seeded = { cases: seedCases(), version: 1 };
    fs.writeFileSync(STORE_PATH, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeStore(store) {
  ensureDirs();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function mapAuditEvent(e) {
  return {
    id: e.id,
    action: e.action,
    actorRole: e.actor_role,
    actorId: e.actor_id,
    actorName: e.actor_name,
    timestamp: e.timestamp,
    details: e.details,
  };
}

function mapEvidenceItem(e) {
  return {
    id: e.id,
    type: e.type,
    fileName: e.fileName || e.file_name,
    url: e.url,
    uploadedBy: e.uploadedBy || e.uploaded_by,
    uploadedAt: e.uploadedAt || e.uploaded_at,
    status: e.status,
  };
}

function toApiCase(row) {
  return {
    id: row.id,
    caseNumber: row.case_number,
    detectionId: row.detection_id,
    title: row.title,
    changeType: row.change_type,
    status: row.status,
    confidence: row.confidence,
    risk: row.risk,
    areaM2: row.area_m2,
    centroidLat: row.centroid_lat,
    centroidLon: row.centroid_lon,
    geometry: row.geometry,
    evidence: row.evidence,
    parcelRef: row.parcel_ref,
    assignedDeveloperId: row.assigned_developer_id,
    mitigationRequirements: row.mitigation_requirements || [],
    auditEvents: (row.audit_events || []).map(mapAuditEvent),
    evidenceItems: (row.evidence_items || []).map(mapEvidenceItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class CaseStore {
  findAll(filters = {}) {
    const store = readStore();
    let rows = [...store.cases];

    if (filters.status) rows = rows.filter((c) => c.status === filters.status);
    if (filters.change_type) rows = rows.filter((c) => c.change_type === filters.change_type);
    if (filters.assigned_developer_id) {
      rows = rows.filter((c) => c.assigned_developer_id === filters.assigned_developer_id);
    }
    if (filters.agency_queue) {
      rows = rows.filter((c) => c.status === 'AGENCY_PENDING' || c.status === 'EVIDENCE_SUBMITTED');
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.case_number.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (c.parcel_ref && c.parcel_ref.toLowerCase().includes(q)),
      );
    }

    const total = rows.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    rows = rows.slice(offset, offset + limit);

    return { data: rows.map(toApiCase), total, limit, offset };
  }

  findById(id) {
    const store = readStore();
    const row = store.cases.find((c) => c.id === id || c.case_number === id);
    return row ? toApiCase(row) : null;
  }

  updateStatus(id, status, auditEntry) {
    if (!STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
    const store = readStore();
    const idx = store.cases.findIndex((c) => c.id === id || c.case_number === id);
    if (idx === -1) return null;

    store.cases[idx].status = status;
    store.cases[idx].updated_at = new Date().toISOString();
    store.cases[idx].audit_events = store.cases[idx].audit_events || [];
    store.cases[idx].audit_events.unshift(auditEntry);
    writeStore(store);
    return toApiCase(store.cases[idx]);
  }

  addMitigation(id, payload, auditEntry) {
    const requirements = payload.requirements || payload;
    const assignedDeveloperId = payload.assignedDeveloperId;
    const store = readStore();
    const idx = store.cases.findIndex((c) => c.id === id || c.case_number === id);
    if (idx === -1) return null;

    store.cases[idx].mitigation_requirements = requirements;
    if (assignedDeveloperId) {
      store.cases[idx].assigned_developer_id = assignedDeveloperId;
    }
    store.cases[idx].status = 'MITIGATION_REQUIRED';
    store.cases[idx].updated_at = new Date().toISOString();
    store.cases[idx].audit_events.unshift(auditEntry);
    writeStore(store);
    return toApiCase(store.cases[idx]);
  }

  addEvidence(id, item, auditEntry) {
    const store = readStore();
    const idx = store.cases.findIndex((c) => c.id === id || c.case_number === id);
    if (idx === -1) return null;

    store.cases[idx].evidence_items = store.cases[idx].evidence_items || [];
    store.cases[idx].evidence_items.unshift(item);
    if (store.cases[idx].status === 'MITIGATION_REQUIRED') {
      store.cases[idx].status = 'EVIDENCE_SUBMITTED';
    }
    store.cases[idx].updated_at = new Date().toISOString();
    store.cases[idx].audit_events.unshift(auditEntry);
    writeStore(store);
    return toApiCase(store.cases[idx]);
  }

  verify(id, decision, auditEntry) {
    const store = readStore();
    const idx = store.cases.findIndex((c) => c.id === id || c.case_number === id);
    if (idx === -1) return null;

    store.cases[idx].status = decision === 'approved' ? 'VERIFIED' : 'REJECTED';
    store.cases[idx].updated_at = new Date().toISOString();
    store.cases[idx].audit_events.unshift(auditEntry);
    writeStore(store);
    return toApiCase(store.cases[idx]);
  }

  getStats() {
    const store = readStore();
    const cases = store.cases;
    return {
      total: cases.length,
      ai_flagged: cases.filter((c) => c.status === 'AI_FLAGGED').length,
      under_review: cases.filter((c) => c.status === 'UNDER_REVIEW').length,
      mitigation_required: cases.filter((c) => c.status === 'MITIGATION_REQUIRED').length,
      pending_verification: cases.filter(
        (c) => c.status === 'EVIDENCE_SUBMITTED' || c.status === 'AGENCY_PENDING',
      ).length,
      high_risk: cases.filter((c) => c.risk?.overall === 'HIGH').length,
      closed: cases.filter((c) => c.status === 'CLOSED' || c.status === 'VERIFIED').length,
    };
  }

  getEvidenceDir(caseId) {
    const dir = path.join(EVIDENCE_DIR, caseId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}

module.exports = new CaseStore();
