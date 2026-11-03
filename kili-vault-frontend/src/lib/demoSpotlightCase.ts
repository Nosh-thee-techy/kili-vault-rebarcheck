import type { CaseStatus, DevelopmentCase } from '@/types';

const STATUS_RANK: Partial<Record<CaseStatus, number>> = {
  AI_FLAGGED: 5,
  UNDER_REVIEW: 4,
  MITIGATION_REQUIRED: 3,
  EVIDENCE_SUBMITTED: 2,
  AGENCY_PENDING: 2,
  REJECTED: 1,
  VERIFIED: 0,
  CLOSED: -1,
};

const RISK_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;

/** Cases that can still be walked through the guided demo. */
export function isDemoEligibleCase(caseItem: DevelopmentCase): boolean {
  return caseItem.status !== 'CLOSED' && caseItem.status !== 'VERIFIED';
}

/** Pick the best open case for demo / spotlight — never a closed one. */
export function pickDemoSpotlightCase(cases: DevelopmentCase[]): DevelopmentCase | undefined {
  const eligible = cases.filter(isDemoEligibleCase);
  if (!eligible.length) return undefined;

  const earlyPipeline = eligible.filter(
    (c) => c.status === 'AI_FLAGGED' || c.status === 'UNDER_REVIEW',
  );
  const pool = earlyPipeline.length ? earlyPipeline : eligible;

  return [...pool].sort((a, b) => {
    const statusDiff = (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0);
    if (statusDiff !== 0) return statusDiff;
    const riskDiff = RISK_RANK[b.risk.overall] - RISK_RANK[a.risk.overall];
    if (riskDiff !== 0) return riskDiff;
    return b.confidence - a.confidence;
  })[0];
}
