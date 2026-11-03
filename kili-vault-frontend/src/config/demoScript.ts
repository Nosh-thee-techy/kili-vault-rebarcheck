import type { UserRole } from '@/types';

export interface PresenterStep {
  id: string;
  title: string;
  instruction: string;
  /** Route template — `:caseId` replaced with spotlight case when present */
  path: string;
  requiredRole: UserRole;
  /** UI hint for what to click (shown in guide bar) */
  actionHint: string;
}

export const PRESENTER_STEPS: PresenterStep[] = [
  {
    id: 'planner-home',
    title: 'Planner command center',
    instruction:
      'You are the Governance Officer. This map-first dashboard shows Kili-Shadows detections across Kilimani Ward in real time.',
    path: '/planner',
    requiredRole: 'planner',
    actionHint: 'Scan the map and priority spotlight card',
  },
  {
    id: 'planner-open-case',
    title: 'Open priority case',
    instruction:
      'Open the spotlight case — satellite evidence with confidence score, risk breakdown, and audit trail.',
    path: '/planner/cases/:caseId',
    requiredRole: 'planner',
    actionHint: 'Click "Open case review" on the spotlight card',
  },
  {
    id: 'planner-review',
    title: 'Human review',
    instruction:
      'AI detects — humans decide. Move the case to Under Review, then require mitigation (e.g. NCWSC infrastructure assessment).',
    path: '/planner/cases/:caseId',
    requiredRole: 'planner',
    actionHint: 'Use Actions panel → Under Review → Require mitigation',
  },
  {
    id: 'developer-upload',
    title: 'Developer evidence',
    instruction:
      'Switch to the developer role. Upload geotagged photos or reports responding to the mitigation requirement.',
    path: '/developer/cases/:caseId',
    requiredRole: 'developer',
    actionHint: 'Upload a file in the Actions panel',
  },
  {
    id: 'planner-agency',
    title: 'Route to agency',
    instruction:
      'Back as planner: send the case to Agency Pending so NCWSC can formally verify the evidence pack.',
    path: '/planner/cases/:caseId',
    requiredRole: 'planner',
    actionHint: 'Actions → Agency Pending',
  },
  {
    id: 'agency-verify',
    title: 'Agency verification',
    instruction:
      'The agency remains authoritative. Review the evidence pack and approve or reject verification.',
    path: '/agency/cases/:caseId',
    requiredRole: 'agency',
    actionHint: 'Approve verification in Actions panel',
  },
  {
    id: 'planner-close',
    title: 'Close with proof',
    instruction:
      'Close the case. The full timeline — detect → review → mitigation → evidence → verify → close — is preserved.',
    path: '/planner/cases/:caseId',
    requiredRole: 'planner',
    actionHint: 'Actions → Closed · Review audit timeline',
  },
];

export function resolvePresenterPath(path: string, caseId: string): string {
  return path.replace(':caseId', caseId);
}
