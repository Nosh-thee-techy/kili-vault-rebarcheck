import { RISK_LEVEL_LABELS } from '@/config/theme';
import type { RiskLevel } from '@/types';

const kindMap: Record<RiskLevel, 'danger' | 'warning' | 'neutral'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'neutral',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <calcite-chip kind={kindMap[level]} scale="s">
      {RISK_LEVEL_LABELS[level]}
    </calcite-chip>
  );
}
