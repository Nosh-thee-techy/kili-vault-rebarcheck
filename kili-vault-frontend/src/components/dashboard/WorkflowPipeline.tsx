import { useNavigate } from 'react-router-dom';
import { CASE_STATUS_LABELS } from '@/config/theme';
import type { CaseStatus, DevelopmentCase } from '@/types';

const STAGES: CaseStatus[] = [
  'AI_FLAGGED',
  'UNDER_REVIEW',
  'MITIGATION_REQUIRED',
  'EVIDENCE_SUBMITTED',
  'AGENCY_PENDING',
  'VERIFIED',
  'CLOSED',
];

export function WorkflowPipeline({
  cases,
  linkPrefix = '/planner/cases',
}: {
  cases: DevelopmentCase[];
  linkPrefix?: string;
}) {
  const navigate = useNavigate();
  const counts = STAGES.map((status) => ({
    status,
    count: cases.filter((caseItem) => caseItem.status === status).length,
  }));

  return (
    <calcite-panel heading="Workflow overview" description="Open the case registry at a workflow stage.">
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {counts.map(({ status, count }) => (
          <calcite-button
            key={status}
            appearance="outline"
            scale="s"
            className="h-auto min-w-32 shrink-0"
            onClick={() => navigate(`${linkPrefix}?status=${status}`)}
            aria-label={`${CASE_STATUS_LABELS[status]}: ${count} cases`}
          >
            <span className="flex min-h-11 flex-col items-start justify-center text-left">
              <span className="text-base font-semibold tabular-nums text-charcoal">{count}</span>
              <span className="max-w-28 whitespace-normal text-xs leading-tight text-charcoal-muted">
                {CASE_STATUS_LABELS[status]}
              </span>
            </span>
          </calcite-button>
        ))}
      </div>
    </calcite-panel>
  );
}
