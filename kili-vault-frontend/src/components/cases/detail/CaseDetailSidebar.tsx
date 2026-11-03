import { Building2, CheckCircle2, Clock, Droplets, Route, TreePine } from 'lucide-react';
import { CaseWorkflowActions } from '@/components/cases/CaseWorkflowActions';
import { Card, CardHeader } from '@/components/ui/Card';
import { WORKFLOW_STEPS } from '@/config/theme';
import { cn } from '@/lib/cn';
import type { DevelopmentCase } from '@/types';

function workflowIndex(status: DevelopmentCase['status']): number {
  const map: Record<DevelopmentCase['status'], number> = {
    AI_FLAGGED: 0,
    UNDER_REVIEW: 1,
    MITIGATION_REQUIRED: 2,
    EVIDENCE_SUBMITTED: 3,
    AGENCY_PENDING: 3,
    VERIFIED: 4,
    REJECTED: 2,
    CLOSED: 4,
  };
  return map[status] ?? 0;
}

function CompactRiskMeter({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-charcoal-muted">
          <Icon className="h-3.5 w-3.5 text-forest" strokeWidth={1.75} />
          {label}
        </span>
        <span className="font-bold tabular-nums text-charcoal">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sand">
        <div
          className="h-full rounded-full bg-gradient-to-r from-forest to-clay"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function WorkflowProgress({ status }: { status: DevelopmentCase['status'] }) {
  const activeStep = workflowIndex(status);

  return (
    <Card padding="sm">
      <CardHeader title="Workflow" description="Current stage in the accountability chain." className="mb-3" />
      <ol className="space-y-0">
        {WORKFLOW_STEPS.map((step, index) => {
          const isComplete = index < activeStep;
          const isCurrent = index === activeStep;
          const isLast = index === WORKFLOW_STEPS.length - 1;

          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                    isComplete && 'border-forest bg-forest text-off-white',
                    isCurrent && 'border-clay bg-clay/15 text-clay-dark',
                    !isComplete && !isCurrent && 'border-sand bg-off-white text-charcoal-muted',
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                  ) : isCurrent ? (
                    <Clock className="h-3.5 w-3.5 animate-pulse" strokeWidth={2} />
                  ) : (
                    <span className="text-[10px] font-bold">{index + 1}</span>
                  )}
                </span>
                {!isLast && (
                  <span
                    className={cn(
                      'my-1 w-px flex-1 min-h-[12px]',
                      isComplete ? 'bg-forest/40' : 'bg-sand',
                    )}
                  />
                )}
              </div>
              <div className={cn('pb-4', isLast && 'pb-0')}>
                <p
                  className={cn(
                    'text-sm font-semibold leading-tight',
                    isCurrent ? 'text-clay-dark' : isComplete ? 'text-forest' : 'text-charcoal-muted',
                  )}
                >
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="mt-0.5 text-xs text-charcoal-muted">In progress</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function CaseDetailSidebar({ caseItem }: { caseItem: DevelopmentCase }) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      <WorkflowProgress status={caseItem.status} />

      <CaseWorkflowActions caseItem={caseItem} />

      <Card padding="sm">
        <CardHeader
          title="Risk scores"
          description="Decision-support only."
          className="mb-3"
        />
        <div className="space-y-3">
          <CompactRiskMeter label="Planning" value={caseItem.risk.planning} icon={Building2} />
          <CompactRiskMeter label="Infrastructure" value={caseItem.risk.infrastructure} icon={Route} />
          <CompactRiskMeter label="Environmental" value={caseItem.risk.environmental} icon={TreePine} />
          <CompactRiskMeter label="Community" value={caseItem.risk.community} icon={Droplets} />
        </div>
      </Card>
    </aside>
  );
}
