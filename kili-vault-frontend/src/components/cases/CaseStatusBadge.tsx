import { CASE_STATUS_LABELS } from '@/config/theme';
import type { CaseStatus } from '@/types';

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <calcite-chip scale="s">{CASE_STATUS_LABELS[status]}</calcite-chip>;
}
