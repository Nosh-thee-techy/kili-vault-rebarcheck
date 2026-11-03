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
    <div className="hidden overflow-hidden rounded-2xl border border-sand bg-off-white shadow-soft md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-sand bg-sand/40 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
          <tr>
            <th className="px-5 py-3">Case</th>
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Risk</th>
            <th className="px-5 py-3">Confidence</th>
            <th className="px-5 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr
              key={c.id}
              className="border-b border-sand/60 transition-colors last:border-0 hover:bg-mist/30"
            >
              <td className="px-5 py-4">
                <Link
                  to={`${caseLinkPrefix}/${c.id}`}
                  className="font-semibold text-forest hover:text-forest-light"
                >
                  {c.caseNumber}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-xs text-charcoal-muted">{c.title}</p>
              </td>
              <td className="px-5 py-4 text-charcoal-muted">{formatChangeType(c.changeType)}</td>
              <td className="px-5 py-4">
                <CaseStatusBadge status={c.status} />
              </td>
              <td className="px-5 py-4">
                <RiskBadge level={c.risk.overall} />
              </td>
              <td className="px-5 py-4 font-mono text-xs">{formatConfidence(c.confidence)}</td>
              <td className="px-5 py-4 text-xs text-charcoal-muted">
                {formatRelativeDate(c.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
