import { Link } from 'react-router-dom';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { formatArea, formatChangeType, formatConfidence, formatRelativeDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { DevelopmentCase } from '@/types';

export function CaseListItem({
  caseItem,
  compact = false,
  caseLinkPrefix = '/planner/cases',
}: {
  caseItem: DevelopmentCase;
  compact?: boolean;
  caseLinkPrefix?: string;
}) {
  return (
    <Link
      to={`${caseLinkPrefix}/${caseItem.id}`}
      className={cn(
        'group flex min-w-0 items-center gap-3 border-b border-sand bg-[var(--calcite-color-foreground-1)] px-3 py-3 text-left text-charcoal transition-colors last:border-b-0 hover:bg-[var(--calcite-color-foreground-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--calcite-color-focus)]',
        compact && 'py-2.5',
      )}
    >
      <calcite-icon icon="clipboard" scale="m" className="shrink-0 text-charcoal-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold text-charcoal group-hover:underline group-hover:underline-offset-2">
            {caseItem.caseNumber}
          </p>
          <CaseStatusBadge status={caseItem.status} />
          <RiskBadge level={caseItem.risk.overall} />
        </div>
        {!compact && (
          <>
            <p className="mt-0.5 line-clamp-1 text-sm text-charcoal-muted">{caseItem.title}</p>
            <p className="mt-1 text-xs text-charcoal-muted">
              {formatChangeType(caseItem.changeType)} · {formatConfidence(caseItem.confidence)} ·{' '}
              {formatArea(caseItem.areaM2)} · Updated {formatRelativeDate(caseItem.updatedAt)}
            </p>
          </>
        )}
      </div>
      <calcite-icon icon="chevron-right" scale="s" className="shrink-0 text-charcoal-muted" />
    </Link>
  );
}
