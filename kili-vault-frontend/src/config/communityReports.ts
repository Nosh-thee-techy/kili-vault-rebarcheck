import type { CommunityReportCategory } from '@/types';

export const COMMUNITY_REPORT_TYPES: {
  id: CommunityReportCategory;
  label: string;
  hint: string;
  calciteIcon: string;
}[] = [
  {
    id: 'CONSTRUCTION',
    label: 'Construction',
    hint: 'New building work, extensions, or heavy machinery on site',
    calciteIcon: 'hammer',
  },
  {
    id: 'LAND_CLEARING',
    label: 'Land clearing',
    hint: 'Trees removed, vegetation stripped, or soil dug up',
    calciteIcon: 'tree',
  },
  {
    id: 'DUMPING',
    label: 'Illegal dumping',
    hint: 'Rubble, waste, or materials dumped on open ground',
    calciteIcon: 'trash',
  },
  {
    id: 'DRAINAGE',
    label: 'Drainage issue',
    hint: 'Blocked drain, flooding, or work near a waterway',
    calciteIcon: 'water-drop',
  },
  {
    id: 'NOISE',
    label: 'Noise / disturbance',
    hint: 'Loud building work outside reasonable hours',
    calciteIcon: 'sound',
  },
  {
    id: 'OTHER',
    label: 'Something else',
    hint: 'Any other physical change you noticed',
    calciteIcon: 'ellipsis',
  },
];

export const OBSERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Waiting for planner',
  LINKED_TO_CASE: 'Linked to a case',
  DISMISSED: 'Reviewed — no action',
};
