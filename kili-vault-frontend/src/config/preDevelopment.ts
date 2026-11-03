import { Building2, HardHat, Trees } from 'lucide-react';
import type { ChangeType } from '@/types';

export const PRE_DEV_PROJECT_TYPES: {
  id: ChangeType;
  label: string;
  hint: string;
  icon: typeof Building2;
}[] = [
  {
    id: 'BUILDING_DEVELOPMENT',
    label: 'New building',
    hint: 'Extension, storey, or new structure',
    icon: Building2,
  },
  {
    id: 'INFRASTRUCTURE_CHANGE',
    label: 'Infrastructure',
    hint: 'Roads, drainage, utilities',
    icon: HardHat,
  },
  {
    id: 'LAND_CLEARING',
    label: 'Land clearing',
    hint: 'Vegetation removal or site prep',
    icon: Trees,
  },
];

export const PRE_DEV_FLOOR_OPTIONS = [
  { value: 1, label: '1 floor' },
  { value: 2, label: '2 floors' },
  { value: 3, label: '3 floors' },
  { value: 4, label: '4 floors' },
  { value: 6, label: '5+ floors' },
] as const;

export const PRE_DEV_COVERAGE_OPTIONS = [
  { value: 35, label: 'Light', hint: '~35% footprint' },
  { value: 50, label: 'Medium', hint: '~50% footprint' },
  { value: 70, label: 'Heavy', hint: '~70% footprint' },
] as const;

export const PRE_DEV_SETBACK_OPTIONS = [
  { value: 3, label: 'Standard', hint: '3m setback' },
  { value: 1.5, label: 'Tight', hint: 'Under 3m' },
] as const;
