import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Droplets,
  FileText,
  Route,
  TreePine,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { CaseWorkflowActions } from '@/components/cases/CaseWorkflowActions';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { CASE_STATUS_COLORS, WORKFLOW_STEPS } from '@/config/theme';
import {
  formatArea,
  formatChangeType,
  formatConfidence,
  formatDate,
} from '@/lib/format';
import { cn } from '@/lib/cn';
import type { DevelopmentCase } from '@/types';

function RiskMeter({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-sand bg-off-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-charcoal">
          <Icon className="h-4 w-4 text-forest" strokeWidth={1.75} />
          {label}
        </div>
        <span className="text-sm font-bold text-charcoal">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sand">
        <div
          className="risk-bar h-full rounded-full bg-gradient-to-r from-forest to-clay"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

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

export function CaseDetailView({
  caseItem,
  mapLinkPrefix = '/planner/map',
}: {
  caseItem: DevelopmentCase;
  mapLinkPrefix?: string;
}) {
  const activeStep = workflowIndex(caseItem.status);
  const statusColor = CASE_STATUS_COLORS[caseItem.status];

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border-l-4 bg-off-white p-5 shadow-soft md:p-6"
        style={{ borderLeftColor: statusColor }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-sage">Development Case</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-charcoal md:text-4xl">
              {caseItem.caseNumber}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-muted md:text-base">
              {caseItem.title}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CaseStatusBadge status={caseItem.status} />
              <RiskBadge level={caseItem.risk.overall} />
              <span className="inline-flex items-center rounded-full bg-sand px-3 py-1 text-xs font-semibold text-charcoal">
                {formatChangeType(caseItem.changeType)}
              </span>
            </div>
          </div>
          <Link to={`${mapLinkPrefix}?case=${caseItem.id}`}>
            <Button variant="outline" size="md">
              View on map
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card padding="md">
            <CardHeader title="Accountability workflow" description="Detect → Assess → Require → Verify → Close" />
            <ol className="grid gap-2 sm:grid-cols-5">
              {WORKFLOW_STEPS.map((step, index) => {
                const isComplete = index < activeStep;
                const isCurrent = index === activeStep;
                return (
                  <li
                    key={step.key}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-center transition-all duration-300',
                      isComplete && 'border-forest/30 bg-forest/5',
                      isCurrent && 'border-clay bg-clay/8 ring-1 ring-clay/20 scale-[1.02]',
                      !isComplete && !isCurrent && 'border-sand bg-off-white',
                    )}
                  >
                    <div className="mb-1 flex justify-center">
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-forest" />
                      ) : isCurrent ? (
                        <Clock className="h-5 w-5 animate-pulse text-clay-dark" />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sand text-xs font-bold text-charcoal-muted">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-charcoal">{step.label}</p>
                  </li>
                );
              })}
            </ol>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card padding="md">
              <CardHeader
                title="Detection evidence"
                description="Physical sensor observations — not a legal determination."
              />
              <dl className="grid gap-3 text-sm">
                <div className="flex justify-between border-b border-sand pb-2">
                  <dt className="text-charcoal-muted">Confidence</dt>
                  <dd className="font-semibold">{formatConfidence(caseItem.confidence)}</dd>
                </div>
                <div className="flex justify-between border-b border-sand pb-2">
                  <dt className="text-charcoal-muted">Area</dt>
                  <dd className="font-semibold">{formatArea(caseItem.areaM2)}</dd>
                </div>
                <div className="flex justify-between border-b border-sand pb-2">
                  <dt className="text-charcoal-muted">Parcel</dt>
                  <dd className="font-mono text-xs font-semibold">{caseItem.parcelRef ?? '—'}</dd>
                </div>
                <div className="flex justify-between border-b border-sand pb-2">
                  <dt className="text-charcoal-muted">Coordinates</dt>
                  <dd className="font-mono text-xs">
                    {caseItem.centroidLat.toFixed(5)}, {caseItem.centroidLon.toFixed(5)}
                  </dd>
                </div>
                {caseItem.detectionId && (
                  <div className="flex justify-between border-b border-sand pb-2">
                    <dt className="text-charcoal-muted">Detection ID</dt>
                    <dd className="font-mono text-xs">{caseItem.detectionId}</dd>
                  </div>
                )}
                {caseItem.assignedDeveloperId && (
                  <div className="flex justify-between">
                    <dt className="text-charcoal-muted">Assigned developer</dt>
                    <dd className="font-mono text-xs">{caseItem.assignedDeveloperId}</dd>
                  </div>
                )}
              </dl>
              {caseItem.linkedDetection && (
                <dl className="mt-4 grid gap-2 rounded-xl border border-sand bg-mist/20 p-4 text-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-sage">
                    Kili-Shadows model scores
                  </p>
                  {caseItem.linkedDetection.ndbiChange != null && (
                    <div className="flex justify-between">
                      <dt className="text-charcoal-muted">NDBI change</dt>
                      <dd className="font-mono">{caseItem.linkedDetection.ndbiChange.toFixed(3)}</dd>
                    </div>
                  )}
                  {caseItem.linkedDetection.ndviChange != null && (
                    <div className="flex justify-between">
                      <dt className="text-charcoal-muted">NDVI change</dt>
                      <dd className="font-mono">{caseItem.linkedDetection.ndviChange.toFixed(3)}</dd>
                    </div>
                  )}
                  {caseItem.linkedDetection.baselineProbability != null && (
                    <div className="flex justify-between">
                      <dt className="text-charcoal-muted">Baseline model</dt>
                      <dd>{formatConfidence(caseItem.linkedDetection.baselineProbability)}</dd>
                    </div>
                  )}
                  {caseItem.linkedDetection.prithviProbability != null && (
                    <div className="flex justify-between">
                      <dt className="text-charcoal-muted">Prithvi model</dt>
                      <dd>{formatConfidence(caseItem.linkedDetection.prithviProbability)}</dd>
                    </div>
                  )}
                  {caseItem.linkedDetection.temporalPersistence != null && (
                    <div className="flex justify-between">
                      <dt className="text-charcoal-muted">Persistence</dt>
                      <dd>{formatConfidence(caseItem.linkedDetection.temporalPersistence)}</dd>
                    </div>
                  )}
                  {caseItem.linkedDetection.modelVersion && (
                    <div className="flex justify-between">
                      <dt className="text-charcoal-muted">Model version</dt>
                      <dd className="font-mono text-xs">{caseItem.linkedDetection.modelVersion}</dd>
                    </div>
                  )}
                </dl>
              )}
              {caseItem.evidence?.explanation && (
                <div className="mt-4 flex gap-3 rounded-xl bg-mist/40 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                  <p className="text-sm leading-relaxed">{caseItem.evidence.explanation}</p>
                </div>
              )}
            </Card>

            <Card padding="md">
              <CardHeader title="Spatial risk breakdown" description="Decision-support indicators only." />
              <div className="grid gap-3">
                <RiskMeter label="Planning" value={caseItem.risk.planning} icon={Building2} />
                <RiskMeter label="Infrastructure" value={caseItem.risk.infrastructure} icon={Route} />
                <RiskMeter label="Environmental" value={caseItem.risk.environmental} icon={TreePine} />
                <RiskMeter label="Community" value={caseItem.risk.community} icon={Droplets} />
              </div>
            </Card>
          </div>

          {(caseItem.mitigationRequirements?.length ?? 0) > 0 && (
            <Card padding="md">
              <CardHeader title="Mitigation requirements" />
              <ul className="list-inside list-disc space-y-1 text-sm text-charcoal">
                {caseItem.mitigationRequirements!.map((req) => (
                  <li key={req}>{req}</li>
                ))}
              </ul>
            </Card>
          )}

          {(caseItem.evidenceItems?.length ?? 0) > 0 && (
            <Card padding="md">
              <CardHeader title="Submitted evidence" />
              <ul className="space-y-2">
                {caseItem.evidenceItems!.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-sand px-4 py-3 text-sm"
                  >
                    <span className="font-medium">{item.fileName}</span>
                    <span className="text-xs text-charcoal-muted">
                      {item.uploadedBy} · {formatDate(item.uploadedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card padding="md">
            <CardHeader
              title="Audit timeline"
              description="Chronological accountability record."
              action={
                <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-muted">
                  <FileText className="h-4 w-4" />
                  {formatDate(caseItem.createdAt)}
                </span>
              }
            />
            <ul className="relative space-y-0 border-l-2 border-sand pl-6">
              {(caseItem.auditEvents ?? []).map((event) => (
                <li key={event.id} className="relative pb-6 last:pb-0">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-off-white bg-forest" />
                  <p className="font-semibold text-charcoal">{event.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-charcoal-muted">
                    {formatDate(event.timestamp)} · {event.actorName} ({event.actorRole}) —{' '}
                    {event.details}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="xl:col-span-1">
          <div className="sticky top-24">
            <CaseWorkflowActions caseItem={caseItem} />
          </div>
        </aside>
      </div>
    </div>
  );
}
