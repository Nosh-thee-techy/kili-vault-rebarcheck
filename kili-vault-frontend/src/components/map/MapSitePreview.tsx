import { Link } from 'react-router-dom';
import { ArrowRight, Radar, X } from 'lucide-react';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { Button } from '@/components/ui/Button';
import { formatArea, formatChangeType, formatConfidence } from '@/lib/format';
import { formatRoadProximity, type SiteProximity } from '@/lib/siteProximity';
import type { DevelopmentCase } from '@/types';

export type MapSelection =
  | { kind: 'case'; caseItem: DevelopmentCase }
  | {
      kind: 'detection';
      id: string;
      changeType: string;
      confidence: number;
    };

export function MapSitePreview({
  selection,
  caseLinkPrefix = '/planner/cases',
  proximity,
  onClose,
}: {
  selection: MapSelection;
  caseLinkPrefix?: string;
  proximity?: SiteProximity | null;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto animate-fade-up w-[min(100%,20rem)] rounded-2xl border border-sand bg-off-white/95 p-4 shadow-lift backdrop-blur-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {selection.kind === 'case' ? (
            <>
              <p className="truncate font-display text-base font-bold text-charcoal">
                {selection.caseItem.caseNumber}
              </p>
              <p className="mt-0.5 truncate text-xs text-charcoal-muted">
                {selection.caseItem.title ?? formatChangeType(selection.caseItem.changeType)}
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 font-display text-base font-bold text-charcoal">
                <Radar className="h-4 w-4 text-clay-dark" />
                Detection
              </p>
              <p className="mt-0.5 text-xs text-charcoal-muted">
                Candidate — not yet a workflow case
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-charcoal-muted transition-colors hover:bg-mist/60 hover:text-charcoal"
          aria-label="Close site preview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {selection.kind === 'case' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <CaseStatusBadge status={selection.caseItem.status} />
            <RiskBadge level={selection.caseItem.risk.overall} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-charcoal-muted">Change</dt>
              <dd className="font-semibold text-charcoal">
                {formatChangeType(selection.caseItem.changeType)}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal-muted">Confidence</dt>
              <dd className="font-semibold text-charcoal">
                {formatConfidence(selection.caseItem.confidence)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-charcoal-muted">Area</dt>
              <dd className="font-semibold text-charcoal">
                {formatArea(selection.caseItem.areaM2)}
              </dd>
            </div>
            {proximity && (
              <>
                <div className="col-span-2">
                  <dt className="text-charcoal-muted">Road proximity</dt>
                  <dd className="font-semibold text-charcoal">
                    {formatRoadProximity(proximity.roadDistanceM)}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-muted">Sewer</dt>
                  <dd className="font-semibold text-charcoal">
                    {proximity.inSeweredArea ? 'Sewered area' : 'Not sewered'}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-muted">Power</dt>
                  <dd className="font-semibold text-charcoal">
                    {proximity.nearPowerLine ? 'Near 11 kV' : 'No line nearby'}
                  </dd>
                </div>
              </>
            )}
          </dl>
          <Link to={`${caseLinkPrefix}/${selection.caseItem.id}`} className="mt-4 block">
            <Button variant="primary" size="sm" className="w-full gap-2">
              Open case
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-charcoal-muted">Change</dt>
              <dd className="font-semibold text-charcoal">
                {selection.changeType.replace(/_/g, ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal-muted">Confidence</dt>
              <dd className="font-semibold text-charcoal">
                {formatConfidence(selection.confidence)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 rounded-xl bg-mist/50 px-3 py-2 text-xs text-charcoal-muted">
            Kili-Shadows flagged this footprint from satellite imagery. A planner can promote it
            to a case.
          </p>
        </>
      )}
    </div>
  );
}
