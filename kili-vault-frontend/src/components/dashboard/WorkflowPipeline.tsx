import { Link } from 'react-router-dom';
import { CASE_STATUS_LABELS } from '@/config/theme';
import { cn } from '@/lib/cn';
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
  const counts = STAGES.map((status) => ({
    status,
    count: cases.filter((c) => c.status === status).length,
  }));

  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-stretch gap-1">
        {counts.map(({ status, count }, index) => (
          <li key={status} className="flex items-stretch">
            <Link
              to={`${linkPrefix}?status=${status}`}
              className={cn(
                'group flex min-w-[88px] flex-col rounded-xl border px-3 py-2.5 transition-all',
                count > 0
                  ? 'border-forest/25 bg-forest/5 hover:border-forest/40 hover:bg-forest/8'
                  : 'border-sand bg-off-white/60 hover:border-sage/50',
              )}
            >
              <span className="font-display text-lg font-bold tabular-nums text-charcoal">
                {count}
              </span>
              <span className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight text-charcoal-muted group-hover:text-charcoal">
                {CASE_STATUS_LABELS[status]}
              </span>
            </Link>
            {index < counts.length - 1 && (
              <span className="mx-0.5 flex w-3 items-center text-sage" aria-hidden>
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
