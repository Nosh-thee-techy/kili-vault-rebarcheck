import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Sparkles } from 'lucide-react';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { Button } from '@/components/ui/Button';
import { usePresenter } from '@/context/PresenterContext';
import { cn } from '@/lib/cn';
import { formatChangeType, formatConfidence } from '@/lib/format';
import type { DevelopmentCase } from '@/types';

export function SpotlightCaseCard({
  caseItem,
  linkPrefix,
}: {
  caseItem: DevelopmentCase;
  linkPrefix: string;
}) {
  const { isActive, step } = usePresenter();
  const highlight = isActive && step?.id === 'planner-open-case';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-clay/25 bg-gradient-to-br from-clay/10 via-off-white to-forest/5 p-5 shadow-soft transition-shadow',
        highlight && 'ring-2 ring-clay shadow-lift animate-pulse-soft',
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-clay/10 blur-2xl" />
      <div className="relative flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-clay-dark" />
        <p className="text-xs font-bold uppercase tracking-wider text-clay-dark">
          Priority spotlight
        </p>
      </div>
      <h3 className="relative mt-3 font-display text-2xl font-bold text-charcoal">
        {caseItem.caseNumber}
      </h3>
      <p className="relative mt-1 line-clamp-2 text-sm text-charcoal-muted">{caseItem.title}</p>

      <div className="relative mt-4 flex flex-wrap gap-2">
        <CaseStatusBadge status={caseItem.status} />
        <RiskBadge level={caseItem.risk.overall} />
      </div>

      <dl className="relative mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-charcoal-muted">Change type</dt>
          <dd className="mt-0.5 font-semibold text-charcoal">
            {formatChangeType(caseItem.changeType)}
          </dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">Confidence</dt>
          <dd className="mt-0.5 font-mono font-semibold text-charcoal">
            {formatConfidence(caseItem.confidence)}
          </dd>
        </div>
      </dl>

      <div className="relative mt-4 flex items-center gap-2 text-xs text-charcoal-muted">
        <MapPin className="h-3.5 w-3.5" />
        <span className="font-mono">
          {caseItem.centroidLat.toFixed(4)}, {caseItem.centroidLon.toFixed(4)}
        </span>
      </div>

      <Link to={`${linkPrefix}/${caseItem.id}`} className="relative mt-5 block">
        <Button variant="secondary" size="md" className="w-full gap-2">
          Open case review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
