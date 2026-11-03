import { ClipboardCheck, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { Button } from '@/components/ui/Button';
import { CASE_STATUS_COLORS } from '@/config/theme';
import { formatArea, formatChangeType, formatConfidence, formatDate } from '@/lib/format';
import type { DevelopmentCase } from '@/types';

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sand bg-mist/30 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-charcoal">{value}</p>
    </div>
  );
}

export function CaseDetailHeader({
  caseItem,
  mapLinkPrefix,
}: {
  caseItem: DevelopmentCase;
  mapLinkPrefix?: string;
}) {
  const isPreDevelopment = Boolean(caseItem.evidence?.preDevelopment);
  const statusColor = CASE_STATUS_COLORS[caseItem.status];

  return (
    <header
      className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft md:p-6"
      style={{ borderLeftWidth: 4, borderLeftColor: statusColor }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage">Development case</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-charcoal md:text-3xl">
            {caseItem.caseNumber}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-charcoal-muted">
            {caseItem.title}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CaseStatusBadge status={caseItem.status} />
            <RiskBadge level={caseItem.risk.overall} />
            {isPreDevelopment && (
              <span className="inline-flex items-center gap-1 rounded-full bg-clay/15 px-2.5 py-1 text-xs font-semibold text-clay-dark">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Pre-check
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-sand px-2.5 py-1 text-xs font-semibold text-charcoal">
              {formatChangeType(caseItem.changeType)}
            </span>
          </div>
        </div>

        {mapLinkPrefix && (
          <Link to={`${mapLinkPrefix}?case=${caseItem.id}`} className="shrink-0">
            <Button variant="outline" size="sm" className="gap-2">
              <MapPin className="h-4 w-4" />
              View on map
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPill label="Confidence" value={formatConfidence(caseItem.confidence)} />
        <StatPill label="Area" value={formatArea(caseItem.areaM2)} />
        <StatPill
          label="Location"
          value={`${caseItem.centroidLat.toFixed(4)}, ${caseItem.centroidLon.toFixed(4)}`}
        />
        <StatPill label="Opened" value={formatDate(caseItem.createdAt)} />
      </div>
    </header>
  );
}
