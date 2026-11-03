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
}: {
  caseItem: DevelopmentCase;
  mapLinkPrefix?: string;
}) {
  const isPreDevelopment = Boolean(caseItem.evidence?.preDevelopment);
  const { stepIndex } = getCaseWorkflowGuide(caseItem, 'planner');

  return (
    <div className="w-full space-y-4 pb-8">
      <header className="space-y-2 border-b border-sand pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-body text-2xl font-semibold text-charcoal">{caseItem.caseNumber}</h1>
          <CaseStatusBadge status={caseItem.status} />
          <RiskBadge level={caseItem.risk.overall} />
          {isPreDevelopment && (
            <calcite-chip icon="clipboard" scale="s">
              Pre-check
            </calcite-chip>
          )}
        </div>
        <p className="text-sm font-medium text-charcoal">{caseItem.title}</p>
        <p className="text-sm text-charcoal-muted">
          {formatChangeType(caseItem.changeType)} · {formatConfidence(caseItem.confidence)} confidence ·{' '}
          {formatArea(caseItem.areaM2)}
        </p>
      </header>

      <calcite-panel heading="Case progress">
        <div className="px-4 py-3">
          <CaseProgressStrip activeIndex={stepIndex} />
        </div>
      </calcite-panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,32%)] lg:items-start">
        <CaseNextStepPanel caseItem={caseItem} />
        <CaseSiteMap caseItem={caseItem} compact />
      </div>

      <CaseFlaggingSummary caseItem={caseItem} />

      <PropertyDevelopmentRecord caseItem={caseItem} />

      <calcite-block heading="Technical details" description="Case references and model evidence." collapsible>
        <div className="px-4 pb-4">
          <CaseEvidencePanel caseItem={caseItem} />
        </div>
      </calcite-block>

      {(caseItem.mitigationRequirements?.length ?? 0) > 0 && (
        <calcite-block heading={`Requirements (${caseItem.mitigationRequirements!.length})`} open>
          <ul className="list-inside list-disc space-y-2 px-4 pb-4 text-sm text-charcoal">
            {caseItem.mitigationRequirements!.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </calcite-block>
      )}

      {(caseItem.auditEvents?.length ?? 0) > 0 && (
        <calcite-block heading={`History (${caseItem.auditEvents!.length})`} collapsible>
          <div className="px-4 pb-4">
            <CaseAuditPanel caseItem={caseItem} />
          </div>
        </calcite-block>
      )}
    </div>
  );
}
