import type { CaseStatus, ChangeType, RiskLevel } from '@/types';

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  BUILDING_DEVELOPMENT: 'Building Development',
  INFRASTRUCTURE_CHANGE: 'Infrastructure Change',
  LAND_CLEARING: 'Land Clearing',
  VEGETATION_CHANGE: 'Vegetation Change',
  SURFACE_CHANGE: 'Surface Change',
  UNKNOWN: 'Unknown Change',
};

export const CHANGE_TYPE_COLORS: Record<ChangeType, string> = {
  BUILDING_DEVELOPMENT: '#C4785A',
  INFRASTRUCTURE_CHANGE: '#5A7D62',
  LAND_CLEARING: '#B54A32',
  VEGETATION_CHANGE: '#3D6B50',
  SURFACE_CHANGE: '#8FA88A',
  UNKNOWN: '#4A4A4F',
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  AI_FLAGGED: 'AI Flagged',
  UNDER_REVIEW: 'Under Review',
  MITIGATION_REQUIRED: 'Mitigation Required',
  EVIDENCE_SUBMITTED: 'Evidence Submitted',
  AGENCY_PENDING: 'Agency Pending',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  AI_FLAGGED: '#C4785A',
  UNDER_REVIEW: '#2A4D38',
  MITIGATION_REQUIRED: '#B54A32',
  EVIDENCE_SUBMITTED: '#5A7D62',
  AGENCY_PENDING: '#8FA88A',
  VERIFIED: '#3D6B50',
  REJECTED: '#B54A32',
  CLOSED: '#4A4A4F',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  HIGH: 'High Risk',
  MEDIUM: 'Medium Risk',
  LOW: 'Low Risk',
};

export const WORKFLOW_STEPS = [
  { key: 'detect', label: 'Detect' },
  { key: 'assess', label: 'Assess' },
  { key: 'require', label: 'Require' },
  { key: 'verify', label: 'Verify' },
  { key: 'close', label: 'Close' },
] as const;
