import { ClipboardCheck } from 'lucide-react';
import { CaseAuditPanel } from '@/components/cases/detail/CaseAuditPanel';
import { CaseEvidencePanel } from '@/components/cases/detail/CaseEvidencePanel';
import { CaseFlaggingSummary } from '@/components/cases/detail/CaseFlaggingSummary';
import { CaseNextStepPanel } from '@/components/cases/detail/CaseNextStepPanel';
import { CaseProgressStrip } from '@/components/cases/detail/CaseProgressStrip';
import { CaseSiteMap } from '@/components/cases/detail/CaseSiteMap';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { RiskBadge } from '@/components/cases/RiskBadge';
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
    <div className="w-full space-y-5 pb-8">
      {/* Title row — minimal */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-charcoal">{caseItem.caseNumber}</h1>
          <CaseStatusBadge status={caseItem.status} />
          <RiskBadge level={caseItem.risk.overall} />
          {isPreDevelopment && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-charcoal-muted">
              <ClipboardCheck className="h-3 w-3" />
              Pre-check
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-charcoal-muted">
          {formatChangeType(caseItem.changeType)} · {formatConfidence(caseItem.confidence)} confidence
          · {formatArea(caseItem.areaM2)}
        </p>
      </div>

      <CaseProgressStrip activeIndex={stepIndex} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_min(22rem,32%)] lg:items-start">
        <CaseNextStepPanel caseItem={caseItem} />
        <CaseSiteMap caseItem={caseItem} compact />
      </div>

      <CaseFlaggingSummary caseItem={caseItem} />

      {/* Everything else — tucked away */}
      <details className="group rounded-2xl border border-sand bg-off-white">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-charcoal [&::-webkit-details-marker]:hidden">
          Technical details
          <span className="ml-2 text-xs font-normal text-charcoal-muted">(optional)</span>
        </summary>
        <div className="border-t border-sand px-5 pb-5 pt-2">
          <CaseEvidencePanel caseItem={caseItem} />
        </div>
      </details>

      {(caseItem.mitigationRequirements?.length ?? 0) > 0 && (
        <details className="rounded-2xl border border-sand bg-off-white" open>
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-charcoal">
            Requirements ({caseItem.mitigationRequirements!.length})
          </summary>
          <ul className="border-t border-sand px-5 pb-4 pt-2 text-sm text-charcoal">
            {caseItem.mitigationRequirements!.map((req) => (
              <li key={req} className="py-1">
                • {req}
              </li>
            ))}
          </ul>
        </details>
      )}

      {(caseItem.auditEvents?.length ?? 0) > 0 && (
        <details className="rounded-2xl border border-sand bg-off-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-charcoal">
            History ({caseItem.auditEvents!.length})
          </summary>
          <div className="border-t border-sand px-5 pb-5 pt-2">
            <CaseAuditPanel caseItem={caseItem} />
          </div>
        </details>
      )}
    </div>
  );
}
