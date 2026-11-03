import { formatArea, formatChangeType, formatConfidence } from '@/lib/format';
import type { ChangeType, DevelopmentCase, PreDevFlag } from '@/types';

export type FlaggingReasonSeverity = 'critical' | 'warning' | 'info';

export interface FlaggingReason {
  severity: FlaggingReasonSeverity;
  category: string;
  text: string;
}

type EvidenceRecord = Record<string, unknown>;

function asRecord(value: unknown): EvidenceRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as EvidenceRecord)
    : null;
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatSigned(value: number, digits = 3): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}`;
}

function baselineEvidence(evidence: EvidenceRecord | undefined): EvidenceRecord {
  if (!evidence) return {};
  return asRecord(evidence.baseline) ?? evidence;
}

function rawSignals(evidence: EvidenceRecord | undefined): EvidenceRecord {
  if (!evidence) return {};
  return asRecord(evidence.raw_signals) ?? {};
}

function temporalPersistenceValue(
  evidence: EvidenceRecord | undefined,
  linked?: DevelopmentCase['linkedDetection'],
): number | null {
  const tp = evidence?.temporal_persistence;
  if (typeof tp === 'number') return tp;
  const tpObj = asRecord(tp);
  if (tpObj) return asNumber(tpObj.value);
  if (linked?.temporalPersistence != null) return linked.temporalPersistence;
  return asNumber(evidence?.persistence);
}

function pushUnique(reasons: FlaggingReason[], reason: FlaggingReason) {
  if (reasons.some((r) => r.text === reason.text)) return;
  reasons.push(reason);
}

function reasonsFromPreDev(flags: PreDevFlag[]): FlaggingReason[] {
  return flags.map((flag) => ({
    severity: flag.severity === 'warning' ? 'warning' : 'info',
    category: 'Pre-development',
    text: flag.text,
  }));
}

function reasonsFromBaseline(
  baseline: EvidenceRecord,
  linked?: DevelopmentCase['linkedDetection'],
): FlaggingReason[] {
  const reasons: FlaggingReason[] = [];
  const deltaNdbi =
    asNumber(baseline.delta_ndbi) ?? asNumber(linked?.ndbiChange) ?? null;
  const deltaNdvi =
    asNumber(baseline.delta_ndvi) ?? asNumber(linked?.ndviChange) ?? null;

  if (baseline.ndbi_increase === true && deltaNdbi != null) {
    pushUnique(reasons, {
      severity: deltaNdbi >= 0.15 ? 'critical' : 'warning',
      category: 'Spectral',
      text: `Built-up index (NDBI) rose ${formatSigned(deltaNdbi)} — new roofs, concrete, or paved surfaces likely appeared`,
    });
  } else if (baseline.spectral_change === true) {
    pushUnique(reasons, {
      severity: 'warning',
      category: 'Spectral',
      text: 'Satellite composites differ measurably between baseline and recent dates',
    });
  }

  if (baseline.ndvi_decrease === true && deltaNdvi != null) {
    pushUnique(reasons, {
      severity: deltaNdvi <= -0.2 ? 'critical' : 'warning',
      category: 'Spectral',
      text: `Vegetation index (NDVI) fell ${formatSigned(deltaNdvi)} — tree canopy or green cover was likely cleared`,
    });
  }

  if (baseline.recent_built_signature === true) {
    pushUnique(reasons, {
      severity: 'critical',
      category: 'Spectral',
      text: 'Combined NDBI rise and NDVI drop matches a recent built-environment signature',
    });
  }

  return reasons;
}

function reasonsFromTemporal(
  evidence: EvidenceRecord | undefined,
  linked?: DevelopmentCase['linkedDetection'],
): FlaggingReason[] {
  const reasons: FlaggingReason[] = [];
  const persistence = temporalPersistenceValue(evidence, linked);
  if (persistence == null) return reasons;

  if (persistence >= 0.85) {
    pushUnique(reasons, {
      severity: 'critical',
      category: 'Temporal',
      text: `Change persists over time (${formatConfidence(persistence)} persistence) — unlikely to be cloud shadow or one-off noise`,
    });
  } else if (persistence >= 0.6) {
    pushUnique(reasons, {
      severity: 'warning',
      category: 'Temporal',
      text: `Moderate temporal persistence (${formatConfidence(persistence)}) — signal seen in more than one observation window`,
    });
  }

  return reasons;
}

function reasonsFromObservations(evidence: EvidenceRecord | undefined): FlaggingReason[] {
  const raw = rawSignals(evidence);
  const recent = asNumber(raw.recent_observations);
  const baseline = asNumber(raw.baseline_observations);
  if (recent == null && baseline == null) return [];

  const parts: string[] = [];
  if (baseline != null) parts.push(`${baseline} baseline`);
  if (recent != null) parts.push(`${recent} recent`);
  return [
    {
      severity: recent != null && recent >= 6 ? 'info' : 'warning',
      category: 'Data quality',
      text: `Supported by ${parts.join(' and ')} cloud-free Sentinel-2 observations`,
    },
  ];
}

function reasonsFromModels(
  evidence: EvidenceRecord | undefined,
  caseItem: DevelopmentCase,
): FlaggingReason[] {
  const reasons: FlaggingReason[] = [];
  const prithvi = asRecord(evidence?.prithvi);
  const probs = asRecord(prithvi?.class_probabilities);

  if (caseItem.confidence >= 0.8) {
    pushUnique(reasons, {
      severity: 'critical',
      category: 'Confidence',
      text: `Overall detection confidence ${formatConfidence(caseItem.confidence)} — above the auto-flag threshold (75%)`,
    });
  } else if (caseItem.confidence >= 0.65) {
    pushUnique(reasons, {
      severity: 'warning',
      category: 'Confidence',
      text: `Detection confidence ${formatConfidence(caseItem.confidence)} — warrants planner review`,
    });
  }

  const baselineProb = caseItem.linkedDetection?.baselineProbability;
  if (baselineProb != null && baselineProb >= 0.5) {
    pushUnique(reasons, {
      severity: baselineProb >= 0.7 ? 'critical' : 'warning',
      category: 'Model',
      text: `Baseline spectral model probability ${formatConfidence(baselineProb)} for ${formatChangeType(caseItem.changeType).toLowerCase()}`,
    });
  }

  if (probs && caseItem.changeType in probs) {
    const classProb = asNumber(probs[caseItem.changeType]);
    if (classProb != null && classProb >= 0.15) {
      pushUnique(reasons, {
        severity: 'info',
        category: 'Model',
        text: `Prithvi-EO class probability ${formatConfidence(classProb)} for ${formatChangeType(caseItem.changeType).toLowerCase()}`,
      });
    }
  }

  return reasons;
}

function reasonsFromSpatial(caseItem: DevelopmentCase, evidence: EvidenceRecord | undefined): FlaggingReason[] {
  const reasons: FlaggingReason[] = [];
  const area = caseItem.areaM2;
  const plausibility = asNumber(evidence?.area_plausibility);

  if (area >= 800) {
    pushUnique(reasons, {
      severity: area >= 2500 ? 'warning' : 'info',
      category: 'Spatial',
      text: `Detected footprint ${formatArea(area)} — size consistent with plot-scale development in Kilimani`,
    });
  }

  if (plausibility != null && plausibility >= 0.85) {
    pushUnique(reasons, {
      severity: 'info',
      category: 'Spatial',
      text: 'Geometry and area fall within expected urban parcel bounds for this ward',
    });
  }

  return reasons;
}

function reasonsFromChangeType(changeType: ChangeType): FlaggingReason[] {
  const map: Partial<Record<ChangeType, FlaggingReason>> = {
    BUILDING_DEVELOPMENT: {
      severity: 'warning',
      category: 'Change type',
      text: 'Classified as building development — triggers planning compliance review',
    },
    INFRASTRUCTURE_CHANGE: {
      severity: 'warning',
      category: 'Change type',
      text: 'Classified as infrastructure change — may require utility coordination (e.g. NCWSC)',
    },
    LAND_CLEARING: {
      severity: 'critical',
      category: 'Change type',
      text: 'Classified as land clearing — elevated environmental and riparian buffer scrutiny',
    },
    VEGETATION_CHANGE: {
      severity: 'warning',
      category: 'Change type',
      text: 'Classified as vegetation change — canopy loss may affect drainage and heat island impacts',
    },
  };
  const reason = map[changeType];
  return reason ? [reason] : [];
}

function reasonsFromRisk(caseItem: DevelopmentCase): FlaggingReason[] {
  const reasons: FlaggingReason[] = [];
  const { risk } = caseItem;

  if (risk.overall === 'HIGH') {
    pushUnique(reasons, {
      severity: 'critical',
      category: 'Risk',
      text: 'Composite spatial risk rated HIGH — multiple dimensions exceed review thresholds',
    });
  }

  const highDimensions = (
    [
      ['Planning', risk.planning],
      ['Infrastructure', risk.infrastructure],
      ['Environmental', risk.environmental],
      ['Community', risk.community],
    ] as const
  ).filter(([, score]) => score >= 85);

  for (const [label, score] of highDimensions) {
    pushUnique(reasons, {
      severity: score >= 95 ? 'critical' : 'warning',
      category: 'Risk',
      text: `${label} risk score ${score}/100 — elevated relative to ward decision-support thresholds`,
    });
  }

  return reasons;
}

function reasonsFromExplanation(evidence: EvidenceRecord | undefined): FlaggingReason[] {
  const baseline = baselineEvidence(evidence);
  const explanation =
    typeof baseline.explanation === 'string'
      ? baseline.explanation
      : typeof evidence?.explanation === 'string'
        ? evidence.explanation
        : null;
  if (!explanation) return [];
  return [{ severity: 'info', category: 'Summary', text: explanation }];
}

function reasonsFromAudit(caseItem: DevelopmentCase): FlaggingReason[] {
  const created = caseItem.auditEvents?.find((e) => e.action === 'CASE_CREATED');
  if (!created?.details) return [];
  if (created.details.includes('Promoted from detection')) {
    return [
      {
        severity: 'info',
        category: 'Provenance',
        text: created.details.replace('Promoted from detection', 'Auto-promoted from Kili-Shadows detection'),
      },
    ];
  }
  return [];
}

/** Build human-readable flagging reasons from case + linked detection evidence. */
export function buildCaseFlaggingReasons(caseItem: DevelopmentCase): FlaggingReason[] {
  if (caseItem.evidence?.preDevelopment && (caseItem.evidence.flags?.length ?? 0) > 0) {
    return reasonsFromPreDev(caseItem.evidence.flags!);
  }

  const evidence = asRecord(caseItem.evidence) ?? asRecord(caseItem.linkedDetection?.evidence) ?? {};
  const baseline = baselineEvidence(evidence);

  const reasons: FlaggingReason[] = [
    ...reasonsFromExplanation(evidence),
    ...reasonsFromBaseline(baseline, caseItem.linkedDetection),
    ...reasonsFromTemporal(evidence, caseItem.linkedDetection),
    ...reasonsFromObservations(evidence),
    ...reasonsFromModels(evidence, caseItem),
    ...reasonsFromSpatial(caseItem, evidence),
    ...reasonsFromChangeType(caseItem.changeType),
    ...reasonsFromRisk(caseItem),
    ...reasonsFromAudit(caseItem),
  ];

  if (reasons.length === 0) {
    return [
      {
        severity: 'warning',
        category: 'Summary',
        text: `${formatChangeType(caseItem.changeType)} detected with ${formatConfidence(caseItem.confidence)} confidence — review recommended`,
      },
    ];
  }

  const severityRank: Record<FlaggingReasonSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return reasons.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
