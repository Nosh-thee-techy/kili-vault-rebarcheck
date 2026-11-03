import type { CaseStatus, UserRole } from '@/types';

export type Permission =
  | 'viewAllCases'
  | 'viewAssignedCases'
  | 'viewPublicMap'
  | 'reviewCase'
  | 'createMitigation'
  | 'closeCase'
  | 'uploadEvidence'
  | 'submitObservation'
  | 'verifyCase'
  | 'manageLayers';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  planner: [
    'viewAllCases',
    'reviewCase',
    'createMitigation',
    'closeCase',
    'uploadEvidence',
    'manageLayers',
  ],
  developer: ['viewAssignedCases', 'uploadEvidence'],
  community: ['viewPublicMap', 'submitObservation'],
  agency: ['viewAllCases', 'verifyCase'],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function allowedStatusTransitions(
  role: UserRole,
  from: CaseStatus,
): CaseStatus[] {
  const map: Partial<Record<UserRole, Partial<Record<CaseStatus, CaseStatus[]>>>> = {
    planner: {
      AI_FLAGGED: ['UNDER_REVIEW', 'CLOSED'],
      UNDER_REVIEW: ['MITIGATION_REQUIRED', 'CLOSED'],
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
  return map[role]?.[from] ?? [];
}
