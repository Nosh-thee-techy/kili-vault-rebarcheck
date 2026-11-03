import { Link } from 'react-router-dom';
import { CASE_STATUS_LABELS } from '@/config/theme';
import { formatChangeType, formatRelativeDate } from '@/lib/format';
import type { DevelopmentCase } from '@/types';

export function AgencyVerificationCard({ caseItem }: { caseItem: DevelopmentCase }) {
  const evidenceCount = caseItem.evidenceItems?.length ?? 0;

  return (
    <calcite-list-item
      label={caseItem.caseNumber}
      description={formatChangeType(caseItem.changeType)}
      value={caseItem.id}
    >
      <div slot="content-end" className="flex items-center gap-2">
        <calcite-chip icon="attachment" scale="s">
          {evidenceCount}
        </calcite-chip>
      </div>
      <div
        slot="content-bottom"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--calcite-color-text-3)]"
      >
        <calcite-chip scale="s">
          {CASE_STATUS_LABELS[caseItem.status] ?? caseItem.status}
        </calcite-chip>
        <calcite-chip scale="s">
          {caseItem.risk.overall} risk
        </calcite-chip>
        <span>Updated {formatRelativeDate(caseItem.updatedAt)}</span>
        <Link
          to={'/agency/cases/' + caseItem.id}
          className="inline-flex items-center gap-1 font-medium text-[var(--calcite-color-text-1)] hover:underline"
        >
          Review evidence
          <calcite-icon icon="chevron-right" scale="s" />
        </Link>
      </div>
    </calcite-list-item>
  );
}
