import { Link } from 'react-router-dom';
import { CaseAuditPanel } from '@/components/cases/detail/CaseAuditPanel';
import { CaseEvidencePanel } from '@/components/cases/detail/CaseEvidencePanel';
import { CaseFlaggingSummary } from '@/components/cases/detail/CaseFlaggingSummary';
import { CaseNextStepPanel } from '@/components/cases/detail/CaseNextStepPanel';
import { CaseProgressStrip } from '@/components/cases/detail/CaseProgressStrip';
import { CaseSiteMap } from '@/components/cases/detail/CaseSiteMap';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { PropertyDevelopmentRecord } from '@/components/cases/detail/PropertyDevelopmentRecord';
import { formatArea, formatChangeType, formatConfidence } from '@/lib/format';
import { getCaseWorkflowGuide } from '@/lib/caseWorkflowGuide';
import type { DevelopmentCase } from '@/types';

export function CaseDetailView({
  caseItem,
  backTo,
}: {
  caseItem: DevelopmentCase;
  backTo: string;
}) {
  const { stepIndex } = getCaseWorkflowGuide(caseItem, 'planner');
  const isPreDevelopment = Boolean(caseItem.evidence?.preDevelopment);
  const hasRequirements = (caseItem.mitigationRequirements?.length ?? 0) > 0;
  const hasHistory = (caseItem.auditEvents?.length ?? 0) > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-sand px-3 py-2 sm:px-4">
        <Link
          to={backTo}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-charcoal hover:underline"
          aria-label="Back to cases"
        >
          <calcite-icon icon="arrow-left" scale="s" />
          <span>Cases</span>
        </Link>

        <div className="min-w-0 flex-1 border-l border-sand pl-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="font-body text-base font-semibold text-charcoal sm:text-lg">
              {caseItem.caseNumber}
            </h1>
            <CaseStatusBadge status={caseItem.status} />
            <RiskBadge level={caseItem.risk.overall} />
            {isPreDevelopment && (
              <calcite-chip icon="clipboard" scale="s">
                Pre-check
              </calcite-chip>
            )}
          </div>
          <p className="truncate text-xs text-charcoal-muted" title={caseItem.title}>
            {caseItem.title}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 text-xs text-charcoal-muted lg:flex">
          {caseItem.parcelRef && <span>Parcel {caseItem.parcelRef}</span>}
          {caseItem.linkedDetection && <span>Kili-Shadows observation</span>}
          {caseItem.detectionId && (
            <span>Detection {caseItem.detectionId.slice(0, 8)}</span>
          )}
          <span>{formatChangeType(caseItem.changeType)}</span>
          <span>{formatArea(caseItem.areaM2)}</span>
          <span>{formatConfidence(caseItem.confidence)} confidence</span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(15rem,45%)_minmax(0,55%)] xl:grid-cols-[minmax(0,1fr)_minmax(21rem,26rem)] xl:grid-rows-1">
        <section className="min-h-0 min-w-0" aria-label="Case site context map">
          <CaseSiteMap
            caseItem={caseItem}
            className="h-full min-h-0"
          />
        </section>

        <aside className="min-h-0 min-w-0 border-t border-sand xl:border-l xl:border-t-0">
          <calcite-panel
            heading="Case investigation"
            className="h-full min-h-0"
          >
            <CaseNextStepPanel caseItem={caseItem} />

            <calcite-block heading="Workflow" description="Current case progress." collapsible open>
              <div className="px-4 pb-3 pt-2">
                <CaseProgressStrip activeIndex={stepIndex} />
              </div>
            </calcite-block>

            <CaseFlaggingSummary caseItem={caseItem} />

            <calcite-block
              heading="Evidence and model output"
              description="Case references, source data, and available model evidence."
              collapsible
            >
              <div className="px-4 pb-4 pt-2">
                <CaseEvidencePanel caseItem={caseItem} />
              </div>
            </calcite-block>

            {hasRequirements && (
              <calcite-block
                heading={`Requirements (${caseItem.mitigationRequirements!.length})`}
                description="Recorded mitigation requirements."
                collapsible
              >
                <ul className="list-inside list-disc space-y-2 px-4 pb-4 pt-2 text-sm text-charcoal">
                  {caseItem.mitigationRequirements!.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </calcite-block>
            )}

            <PropertyDevelopmentRecord caseItem={caseItem} />

            {hasHistory && (
              <calcite-block
                heading={`History (${caseItem.auditEvents!.length})`}
                description="Recorded case activity."
                collapsible
              >
                <div className="px-4 pb-4 pt-2">
                  <CaseAuditPanel caseItem={caseItem} />
                </div>
              </calcite-block>
            )}
          </calcite-panel>
        </aside>
      </div>
    </div>
  );
}
