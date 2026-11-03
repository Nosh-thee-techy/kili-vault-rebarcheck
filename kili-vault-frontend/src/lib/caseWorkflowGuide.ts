import { CASE_STATUS_LABELS } from '@/config/theme';
import type { CaseStatus, DevelopmentCase, UserRole } from '@/types';

export const PROCESS_STEPS = ['Detected', 'Reviewed', 'Developer', 'Verified', 'Closed'] as const;

function stepIndex(status: CaseStatus): number {
  const map: Record<CaseStatus, number> = {
    AI_FLAGGED: 0,
    UNDER_REVIEW: 1,
    MITIGATION_REQUIRED: 2,
    EVIDENCE_SUBMITTED: 3,
    AGENCY_PENDING: 3,
    VERIFIED: 4,
    REJECTED: 2,
    CLOSED: 4,
  };
  return map[status] ?? 0;
}

export interface CaseWorkflowGuide {
  stepIndex: number;
  statusLabel: string;
  summary: string;
  instruction: string;
}

export function getCaseWorkflowGuide(
  caseItem: DevelopmentCase,
  role: UserRole,
): CaseWorkflowGuide {
  const idx = stepIndex(caseItem.status);
  const statusLabel = CASE_STATUS_LABELS[caseItem.status];

  const summaries: Partial<Record<CaseStatus, string>> = {
    AI_FLAGGED: 'Kili-Shadows spotted a physical change here from satellite imagery.',
    UNDER_REVIEW: 'A planner is deciding whether this needs a formal response.',
    MITIGATION_REQUIRED: 'Waiting for the assigned developer to upload proof.',
    EVIDENCE_SUBMITTED: 'Developer uploaded files — planner can forward to agency.',
    AGENCY_PENDING: 'With an external verifier (e.g. NCWSC) for sign-off.',
    VERIFIED: 'Verification passed — ready to close.',
    REJECTED: 'Verification failed — developer may need to resubmit.',
    CLOSED: 'This case is finished.',
  };

  const instructions: Partial<Record<UserRole, Partial<Record<CaseStatus, string>>>> = {
    planner: {
      AI_FLAGGED: 'Open the reasons below, then move to Review or close as a false alarm.',
      UNDER_REVIEW: 'Add what the developer must do, pick who owns it, and click Require mitigation.',
      MITIGATION_REQUIRED: 'Waiting on the developer — no action needed until they upload.',
      EVIDENCE_SUBMITTED: 'Check their uploads, then send to Agency for verification.',
      AGENCY_PENDING: 'Waiting on agency — no action needed until they decide.',
      VERIFIED: 'Close the case to complete the record.',
      REJECTED: 'Send back to developer with updated requirements if needed.',
      CLOSED: 'Nothing left to do.',
    },
    developer: {
      MITIGATION_REQUIRED: 'Read the requirements, upload your evidence file (PDF or photo).',
      EVIDENCE_SUBMITTED: 'Submitted — waiting for planner and agency review.',
      AGENCY_PENDING: 'Under external review — check back later.',
      REJECTED: 'Upload corrected evidence if the planner reopens requirements.',
      CLOSED: 'Case complete.',
      VERIFIED: 'Case complete.',
    },
    agency: {
      EVIDENCE_SUBMITTED: 'Review the evidence and approve or reject.',
      AGENCY_PENDING: 'Review the evidence and approve or reject.',
    },
  };

  const summary = summaries[caseItem.status] ?? 'Case in progress.';
  const instruction =
    instructions[role]?.[caseItem.status] ??
    (role === 'developer'
      ? 'No action needed on your side right now.'
      : 'Review the site map and flagging reasons below.');

  return { stepIndex: idx, statusLabel, summary, instruction };
}
