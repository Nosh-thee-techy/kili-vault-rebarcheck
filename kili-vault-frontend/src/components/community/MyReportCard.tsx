import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Link2 } from 'lucide-react';
import { COMMUNITY_REPORT_TYPES, OBSERVATION_STATUS_LABELS } from '@/config/communityReports';
import { formatRelativeDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { CommunityObservation } from '@/types';

export function MyReportCard({ report }: { report: CommunityObservation }) {
  const type = COMMUNITY_REPORT_TYPES.find((t) => t.id === report.category);
  const Icon = type?.icon ?? Clock;
  const statusLabel = OBSERVATION_STATUS_LABELS[report.status] ?? report.status;

  const statusTone =
    report.status === 'LINKED_TO_CASE'
      ? 'text-forest bg-forest/10'
      : report.status === 'PENDING_REVIEW'
        ? 'text-clay-dark bg-clay/10'
        : 'text-charcoal-muted bg-sand';

  return (
    <article className="rounded-2xl border border-sand bg-off-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist/60 text-charcoal">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-charcoal">{type?.label ?? 'Report'}</h3>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', statusTone)}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-charcoal-muted">{report.description}</p>
          <p className="mt-2 text-xs text-charcoal-muted">{formatRelativeDate(report.createdAt)}</p>
        </div>
      </div>

      {report.status === 'LINKED_TO_CASE' && report.caseId && (
        <Link
          to={`/community/cases/${report.caseId}`}
          className="mt-3 flex items-center gap-2 rounded-xl bg-forest/8 px-3 py-2 text-sm font-semibold text-forest"
        >
          <Link2 className="h-4 w-4" />
          Your report helped open a case
          <ArrowRight className="ml-auto h-4 w-4" />
        </Link>
      )}

      {report.status === 'PENDING_REVIEW' && (
        <p className="mt-3 flex items-center gap-2 text-xs text-charcoal-muted">
          <Clock className="h-3.5 w-3.5" />
          A planner will review this within the ward workflow
        </p>
      )}

      {report.status === 'DISMISSED' && (
        <p className="mt-3 flex items-center gap-2 text-xs text-charcoal-muted">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Reviewed — no further action needed right now
        </p>
      )}
    </article>
  );
}
