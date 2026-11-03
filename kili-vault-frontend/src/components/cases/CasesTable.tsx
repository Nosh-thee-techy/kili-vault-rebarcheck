import { Link } from 'react-router-dom';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { formatChangeType, formatConfidence, formatRelativeDate } from '@/lib/format';
import type { DevelopmentCase } from '@/types';

export function CasesTable({
  cases,
  caseLinkPrefix,
}: {
  cases: DevelopmentCase[];
  caseLinkPrefix: string;
}) {
  return (
    <div className="hidden min-w-0 md:block">
      <calcite-table caption="Development cases" bordered scale="m">
        <calcite-table-row slot="table-header">
          <calcite-table-header heading="Case" />
          <calcite-table-header heading="Change type" />
          <calcite-table-header heading="Status" />
          <calcite-table-header heading="Risk" />
          <calcite-table-header heading="Confidence" />
          <calcite-table-header heading="Updated" />
        </calcite-table-row>
        {cases.map((caseItem) => (
          <calcite-table-row key={caseItem.id}>
            <calcite-table-cell>
              <div className="min-w-44 py-1">
                <Link
                  to={`${caseLinkPrefix}/${caseItem.id}`}
                  className="font-semibold text-charcoal underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--calcite-color-focus)]"
                >
                  {caseItem.caseNumber}
                </Link>
                <p className="mt-0.5 max-w-[22rem] truncate text-xs text-charcoal-muted">
                  {caseItem.title}
                </p>
              </div>
            </calcite-table-cell>
            <calcite-table-cell>{formatChangeType(caseItem.changeType)}</calcite-table-cell>
            <calcite-table-cell>
              <CaseStatusBadge status={caseItem.status} />
            </calcite-table-cell>
            <calcite-table-cell>
              <RiskBadge level={caseItem.risk.overall} />
            </calcite-table-cell>
            <calcite-table-cell>{formatConfidence(caseItem.confidence)}</calcite-table-cell>
            <calcite-table-cell>{formatRelativeDate(caseItem.updatedAt)}</calcite-table-cell>
          </calcite-table-row>
        ))}
      </calcite-table>
    </div>
  );
}
