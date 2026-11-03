'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../repositories/db');
const caseRepository = require('../repositories/caseRepository');
const { AppError } = require('../middleware/errorHandler');

/** Indicative ward guidance — informational only, not legal limits */
const GUIDANCE = {
  maxCoveragePct: 60,
  maxFloors: 4,
  minSetbackM: 3,
};

const VALID_CHANGE_TYPES = [
  'BUILDING_DEVELOPMENT',
  'INFRASTRUCTURE_CHANGE',
  'LAND_CLEARING',
];

function parseInput(body) {
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  const changeType = body.change_type || body.changeType;
  const proposedFloors = Number(body.proposed_floors ?? body.proposedFloors ?? 1);
  const coveragePercent = Number(body.coverage_percent ?? body.coveragePercent ?? 0);
  const setbackMeters = Number(body.setback_meters ?? body.setbackMeters ?? 3);
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new AppError('VALIDATION_ERROR', 'Valid lat is required', 400);
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new AppError('VALIDATION_ERROR', 'Valid lon is required', 400);
  }
  if (!VALID_CHANGE_TYPES.includes(changeType)) {
    throw new AppError('VALIDATION_ERROR', 'Invalid change_type', 400);
  }
  if (!description || description.length > 5000) {
    throw new AppError('VALIDATION_ERROR', 'description is required (max 5000 chars)', 400);
  }

  return {
    lat,
    lon,
    changeType,
    proposedFloors: Math.max(1, Math.min(50, proposedFloors)),
    coveragePercent: Math.max(0, Math.min(100, coveragePercent)),
    setbackMeters: Math.max(0, Math.min(100, setbackMeters)),
    description,
  };
}

function pointToPolygon(lat, lon, delta = 0.00008) {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lon - delta, lat - delta],
        [lon + delta, lat - delta],
        [lon + delta, lat + delta],
        [lon - delta, lat + delta],
        [lon - delta, lat - delta],
      ],
    ],
  };
}

function assessPreDevelopment(input) {
  let planning = 22;
  let infrastructure = 18;
  let environmental = 18;
  let community = 12;
  const flags = [];

  if (input.coveragePercent > GUIDANCE.maxCoveragePct) {
    planning += 28;
    flags.push({
      severity: 'warning',
      text: `Proposed ground coverage (${input.coveragePercent}%) exceeds typical ward guidance (~${GUIDANCE.maxCoveragePct}%)`,
    });
  }

  if (input.proposedFloors > GUIDANCE.maxFloors) {
    planning += 22;
    flags.push({
      severity: 'warning',
      text: `Proposed height (${input.proposedFloors} floors) may exceed typical local guidance (~${GUIDANCE.maxFloors} floors)`,
    });
  }

  if (input.setbackMeters < GUIDANCE.minSetbackM) {
    planning += 14;
    environmental += 12;
    flags.push({
      severity: 'warning',
      text: `Declared setback (${input.setbackMeters}m) is below typical minimum (~${GUIDANCE.minSetbackM}m)`,
    });
  }

  switch (input.changeType) {
    case 'INFRASTRUCTURE_CHANGE':
      infrastructure += 32;
      flags.push({
        severity: 'info',
        text: 'Infrastructure works often require utility coordination (e.g. NCWSC for drainage/sewer)',
      });
      break;
    case 'LAND_CLEARING':
      environmental += 38;
      planning += 10;
      flags.push({
        severity: 'warning',
        text: 'Land clearing may trigger riparian buffer and environmental review near waterways',
      });
      break;
    case 'BUILDING_DEVELOPMENT':
      planning += 12;
      community += 8;
      break;
    default:
      break;
  }

  planning = Math.min(100, planning);
  infrastructure = Math.min(100, infrastructure);
  environmental = Math.min(100, environmental);
  community = Math.min(100, Math.round((planning + infrastructure + environmental) / 3));

  const maxScore = Math.max(planning, infrastructure, environmental, community);
  const warningCount = flags.filter((f) => f.severity === 'warning').length;
  let overall = 'LOW';
  if (maxScore >= 68 || warningCount >= 2) overall = 'HIGH';
  else if (maxScore >= 42 || warningCount >= 1) overall = 'MEDIUM';

  const confidence = Math.round((maxScore / 100) * 100) / 100;
  const areaM2 = Math.round(400 + input.coveragePercent * 12);

  return {
    risk: { planning, infrastructure, environmental, community, overall },
    flags,
    confidence,
    areaM2,
    disclaimer:
      'Projected risk assessment — informational only. Not a permit, legal clearance, or county approval.',
  };
}

async function nextCaseNumber(client) {
  const res = await client.query(
    `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(case_number, '\\D', '', 'g') AS INTEGER)), 10126) + 1 AS n
     FROM development_cases`,
  );
  return `KV-${String(res.rows[0].n).padStart(5, '0')}`;
}

async function preview(body) {
  const input = parseInput(body);
  const assessment = assessPreDevelopment(input);
  return {
    ...assessment,
    input,
    title: buildTitle(input),
  };
}

function buildTitle(input) {
  return `Pre-development check: ${input.changeType.replace(/_/g, ' ').toLowerCase()} near ${input.lat.toFixed(4)}, ${input.lon.toFixed(4)}`;
}

async function submit(body, user) {
  if (!['developer', 'planner'].includes(user.role)) {
    throw new AppError('FORBIDDEN', 'Only developers or planners can submit pre-development checks', 403);
  }

  const input = parseInput(body);
  const assessment = assessPreDevelopment(input);

  const storage = await caseRepository.getStorageInfo();
  if (storage.mode !== 'postgres') {
    return caseRepository.createPreDevelopment(input, assessment, user);
  }
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    const caseNumber = await nextCaseNumber(client);
    const caseId = `case_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const geometry = pointToPolygon(input.lat, input.lon);
    const assignedDeveloperId = user.role === 'developer' ? user.id : body.assigned_developer_id || user.id;

    const evidence = {
      preDevelopment: true,
      proposedFloors: input.proposedFloors,
      coveragePercent: input.coveragePercent,
      setbackMeters: input.setbackMeters,
      description: input.description,
      flags: assessment.flags,
      disclaimer: assessment.disclaimer,
      assessedAt: now,
    };

    await client.query(
      `INSERT INTO development_cases (
         id, case_number, detection_id, title, change_type, status, confidence,
         risk, area_m2, centroid_lat, centroid_lon, geometry, evidence,
         assigned_developer_id, mitigation_requirements, created_at, updated_at
       ) VALUES (
         $1, $2, NULL, $3, $4, 'UNDER_REVIEW', $5,
         $6::jsonb, $7, $8, $9, ST_SetSRID(ST_GeomFromGeoJSON($10), 4326), $11::jsonb,
         $12, '[]'::jsonb, $13, $13
       )`,
      [
        caseId,
        caseNumber,
        buildTitle(input),
        input.changeType,
        assessment.confidence,
        JSON.stringify(assessment.risk),
        assessment.areaM2,
        input.lat,
        input.lon,
        JSON.stringify(geometry),
        JSON.stringify(evidence),
        assignedDeveloperId,
        now,
      ],
    );

    await client.query(
      `INSERT INTO case_audit_events (id, case_id, action, actor_role, actor_id, actor_name, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuidv4(),
        caseId,
        'PRE_DEVELOPMENT_SUBMITTED',
        user.role,
        user.id,
        user.name,
        `Self-reported pre-development check submitted for planner review (${assessment.risk.overall} projected risk)`,
        now,
      ],
    );

    await client.query('COMMIT');
    return caseRepository.findById(caseId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  preview,
  submit,
  assessPreDevelopment,
  GUIDANCE,
};
