import { Link } from 'react-router-dom';
import { FileCheck, Paperclip } from 'lucide-react';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { Button } from '@/components/ui/Button';
import { formatChangeType, formatRelativeDate } from '@/lib/format';
import type { DevelopmentCase } from '@/types';

export function AgencyVerificationCard({ caseItem }: { caseItem: DevelopmentCase }) {
  const evidenceCount = caseItem.evidenceItems?.length ?? 0;

  return (
    <article className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft transition-all hover:border-forest/20 hover:shadow-lift">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold text-charcoal">{caseItem.caseNumber}</p>
          <p className="mt-0.5 text-sm text-charcoal-muted">{formatChangeType(caseItem.changeType)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CaseStatusBadge status={caseItem.status} />
          <RiskBadge level={caseItem.risk.overall} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-xl bg-mist/40 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest/10">
          <Paperclip className="h-5 w-5 text-forest" />
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">
            {evidenceCount} evidence item{evidenceCount === 1 ? '' : 's'} ready
          </p>
          <p className="text-xs text-charcoal-muted">
            Submitted {formatRelativeDate(caseItem.updatedAt)}
          </p>
        </div>
      </div>

      <Link to={`/agency/cases/${caseItem.id}`} className="mt-4 block">
        <Button variant="primary" size="md" className="w-full gap-2">
          <FileCheck className="h-4 w-4" />
          Review verification pack
        </Button>
      </Link>
    </article>
  );
}
