import type { ChangeType, RiskLevel } from '@/types';
import { CHANGE_TYPE_LABELS } from '@/config/theme';

export function formatChangeType(type: ChangeType): string {
  return CHANGE_TYPE_LABELS[type] ?? type;
}

export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatArea(m2: number): string {
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${Math.round(m2)} m²`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

export function riskFromConfidence(confidence: number, changeType: ChangeType): RiskLevel {
  const infraTypes: ChangeType[] = ['INFRASTRUCTURE_CHANGE', 'BUILDING_DEVELOPMENT'];
  if (confidence >= 0.8 && infraTypes.includes(changeType)) return 'HIGH';
  if (confidence >= 0.65) return 'MEDIUM';
  return 'LOW';
}

export function buildRiskBreakdown(
  confidence: number,
  changeType: ChangeType,
): {
  planning: number;
  infrastructure: number;
  environmental: number;
  community: number;
  overall: RiskLevel;
} {
  const base = Math.round(confidence * 100);
  const planning = Math.min(100, base + (changeType === 'BUILDING_DEVELOPMENT' ? 8 : 0));
  const infrastructure = Math.min(
    100,
    base + (changeType === 'INFRASTRUCTURE_CHANGE' ? 12 : 4),
  );
  const environmental = Math.min(
    100,
    base - (changeType === 'VEGETATION_CHANGE' ? -5 : 10),
  );
  const community = Math.min(100, Math.round((planning + infrastructure) / 2 - 5));
  const overall = riskFromConfidence(confidence, changeType);
  return { planning, infrastructure, environmental, community, overall };
}
