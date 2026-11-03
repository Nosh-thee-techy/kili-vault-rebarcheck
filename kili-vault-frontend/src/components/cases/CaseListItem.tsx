import { ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { formatArea, formatChangeType, formatConfidence, formatRelativeDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { DevelopmentCase } from '@/types';
import { CHANGE_TYPE_COLORS } from '@/config/theme';

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
        'group flex gap-4 rounded-2xl border border-sand bg-off-white p-4 transition-all duration-200',
        'hover:border-forest/20 hover:shadow-soft active:scale-[0.995] md:p-5',
      )}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${CHANGE_TYPE_COLORS[caseItem.changeType]}18` }}
      >
        <MapPin
          className="h-5 w-5"
          style={{ color: CHANGE_TYPE_COLORS[caseItem.changeType] }}
          strokeWidth={1.75}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-charcoal group-hover:text-forest">{caseItem.caseNumber}</p>
            {!compact && (
              <p className="mt-0.5 line-clamp-1 text-sm text-charcoal-muted">{caseItem.title}</p>
            )}
          </div>
          <ChevronRight className="hidden h-5 w-5 shrink-0 text-sage group-hover:text-forest md:block" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CaseStatusBadge status={caseItem.status} />
          <RiskBadge level={caseItem.risk.overall} />
          {!compact && (
            <span className="text-xs text-charcoal-muted">
              {formatChangeType(caseItem.changeType)} · {formatConfidence(caseItem.confidence)}
            </span>
          )}
        </div>

        {!compact && (
          <p className="mt-2 text-xs text-charcoal-muted">
            {formatArea(caseItem.areaM2)} · Updated {formatRelativeDate(caseItem.updatedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}
