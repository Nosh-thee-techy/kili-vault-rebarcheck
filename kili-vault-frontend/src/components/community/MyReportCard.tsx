import { Link } from 'react-router-dom';
import {
  COMMUNITY_REPORT_TYPES,
  OBSERVATION_STATUS_LABELS,
} from '@/config/communityReports';
import { formatRelativeDate } from '@/lib/format';
import type { CommunityObservation } from '@/types';

const STATUS_ICONS: Record<string, string> = {
  PENDING_REVIEW: 'clock',
  LINKED_TO_CASE: 'link',
  DISMISSED: 'check',
};

export function MyReportCard({ report }: { report: CommunityObservation }) {
  const category = report.category ?? 'OTHER';
  const type = COMMUNITY_REPORT_TYPES.find((item) => item.id === category);
  const statusLabel =
    OBSERVATION_STATUS_LABELS[report.status] ?? report.status;
  const summary =
    report.description.length > 180
      ? report.description.slice(0, 177) + '…'
      : report.description;

  return (
    <calcite-list-item
      label={type?.label ?? 'Report'}
      description={summary}
      value={report.id}
    >
      <calcite-icon
        slot="content-start"
        icon={type?.calciteIcon ?? 'map-pin'}
        scale="m"
      />
      <calcite-chip
        slot="content-end"
        icon={STATUS_ICONS[report.status] ?? 'information'}
        scale="s"
      >
        {statusLabel}
      </calcite-chip>
      <div
        slot="content-bottom"
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[var(--calcite-color-text-3)]"
      >
        <span>Submitted {formatRelativeDate(report.createdAt)}</span>
        {report.status === 'LINKED_TO_CASE' && report.caseId ? (
          <Link
            to={'/community/cases/' + report.caseId}
            className="inline-flex items-center gap-1 font-medium text-[var(--calcite-color-text-1)] hover:underline"
          >
            View linked case
            <calcite-icon icon="chevron-right" scale="s" />
          </Link>
        ) : report.status === 'PENDING_REVIEW' ? (
          <span>A planner will review this report.</span>
        ) : report.status === 'DISMISSED' ? (
          <span>Reviewed; no further action is required now.</span>
        ) : null}
      </div>
    </calcite-list-item>
  );
}
