import { Link } from 'react-router-dom';
import { CASE_STATUS_LABELS } from '@/config/theme';
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
  const isCase = selection.kind === 'case';
  const title = isCase
    ? selection.caseItem.caseNumber
    : 'Candidate detection';
  const description = isCase
    ? selection.caseItem.title ??
      formatChangeType(selection.caseItem.changeType)
    : 'Satellite observation · not yet a workflow case';

  return (
    <section className="pointer-events-auto w-[min(100%,20rem)] border border-[var(--calcite-color-border-3)] bg-[var(--calcite-color-background)] p-3 shadow-md">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[var(--calcite-color-text-1)]">
            {title}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--calcite-color-text-3)]">
            {description}
          </p>
        </div>
        <calcite-button
          appearance="transparent"
          icon-start="x"
          scale="s"
          label="Close map selection"
          onClick={onClose}
        />
      </header>

      {isCase ? (
        <>
          <div className="flex flex-wrap gap-2">
            <calcite-chip scale="s">
              {CASE_STATUS_LABELS[selection.caseItem.status] ??
                selection.caseItem.status}
            </calcite-chip>
            <calcite-chip scale="s">
              {selection.caseItem.risk.overall} risk
            </calcite-chip>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-[var(--calcite-color-text-3)]">Change</dt>
              <dd className="font-medium text-[var(--calcite-color-text-1)]">
                {formatChangeType(selection.caseItem.changeType)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--calcite-color-text-3)]">
                Confidence
              </dt>
              <dd className="font-medium text-[var(--calcite-color-text-1)]">
                {formatConfidence(selection.caseItem.confidence)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[var(--calcite-color-text-3)]">Area</dt>
              <dd className="font-medium text-[var(--calcite-color-text-1)]">
                {formatArea(selection.caseItem.areaM2)}
              </dd>
            </div>
            {proximity && (
              <>
                <div className="col-span-2 border-t border-[var(--calcite-color-border-3)] pt-2">
                  <dt className="text-[var(--calcite-color-text-3)]">
                    Road proximity
                  </dt>
                  <dd className="font-medium text-[var(--calcite-color-text-1)]">
                    {formatRoadProximity(proximity.roadDistanceM)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--calcite-color-text-3)]">Sewer</dt>
                  <dd className="font-medium text-[var(--calcite-color-text-1)]">
                    {proximity.inSeweredArea
                      ? 'Inside mapped service area'
                      : 'Outside mapped service area'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--calcite-color-text-3)]">Power</dt>
                  <dd className="font-medium text-[var(--calcite-color-text-1)]">
                    {proximity.nearPowerLine
                      ? 'Near mapped 11 kV line'
                      : 'No nearby line observed'}
                  </dd>
                </div>
              </>
            )}
          </dl>
          <Link
            to={caseLinkPrefix + '/' + selection.caseItem.id}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--calcite-color-text-1)] hover:underline"
          >
            Open case
            <calcite-icon icon="chevron-right" scale="s" />
          </Link>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-[var(--calcite-color-text-3)]">Change</dt>
              <dd className="font-medium text-[var(--calcite-color-text-1)]">
                {selection.changeType.replace(/_/g, ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--calcite-color-text-3)]">
                Confidence
              </dt>
              <dd className="font-medium text-[var(--calcite-color-text-1)]">
                {formatConfidence(selection.confidence)}
              </dd>
            </div>
          </div>
          <calcite-notice open kind="info" scale="s" className="mt-3">
            This candidate comes from satellite imagery. A planner must review
            it before it is treated as a workflow case.
          </calcite-notice>
        </>
      )}
    </section>
  );
}
