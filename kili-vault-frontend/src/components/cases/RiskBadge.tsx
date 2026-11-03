import { Badge } from '@/components/ui/Badge';
import { RISK_LEVEL_LABELS } from '@/config/theme';
import type { RiskLevel } from '@/types';

const variantMap: Record<RiskLevel, 'risk-high' | 'risk-medium' | 'risk-low'> = {
  HIGH: 'risk-high',
  MEDIUM: 'risk-medium',
  LOW: 'risk-low',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge variant={variantMap[level]}>{RISK_LEVEL_LABELS[level]}</Badge>;
}
