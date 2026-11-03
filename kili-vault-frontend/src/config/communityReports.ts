import { HardHat, Leaf, Megaphone, MoreHorizontal, Trash2, Waves } from 'lucide-react';
import type { CommunityReportCategory } from '@/types';

export const COMMUNITY_REPORT_TYPES: {
  id: CommunityReportCategory;
  label: string;
  hint: string;
  icon: typeof HardHat;
}[] = [
  {
    id: 'CONSTRUCTION',
    label: 'Construction',
    hint: 'New building work, extensions, or heavy machinery on site',
    icon: HardHat,
  },
  {
    id: 'LAND_CLEARING',
    label: 'Land clearing',
    hint: 'Trees removed, vegetation stripped, or soil dug up',
    icon: Leaf,
  },
  {
    id: 'DUMPING',
    label: 'Illegal dumping',
    hint: 'Rubble, waste, or materials dumped on open ground',
    icon: Trash2,
  },
  {
    id: 'DRAINAGE',
    label: 'Drainage issue',
    hint: 'Blocked drain, flooding, or work near a waterway',
    icon: Waves,
  },
  {
    id: 'NOISE',
    label: 'Noise / disturbance',
    hint: 'Loud building work outside reasonable hours',
    icon: Megaphone,
  },
  {
    id: 'OTHER',
    label: 'Something else',
    hint: 'Any other physical change you noticed',
    icon: MoreHorizontal,
  },
];

export const OBSERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Waiting for planner',
  LINKED_TO_CASE: 'Linked to a case',
  DISMISSED: 'Reviewed — no action',
};
