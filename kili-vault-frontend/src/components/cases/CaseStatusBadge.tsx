import { Badge } from '@/components/ui/Badge';
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS } from '@/config/theme';
import type { CaseStatus } from '@/types';

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge dotColor={CASE_STATUS_COLORS[status]} variant="forest">
      {CASE_STATUS_LABELS[status]}
    </Badge>
  );
}
