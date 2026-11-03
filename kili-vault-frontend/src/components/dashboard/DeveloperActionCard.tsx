import { Link } from 'react-router-dom';
import { Clock, FileUp, Upload } from 'lucide-react';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';
import { Button } from '@/components/ui/Button';
import { formatRelativeDate } from '@/lib/format';
import type { DevelopmentCase } from '@/types';

export function DeveloperActionCard({
  caseItem,
}: {
  caseItem: DevelopmentCase;
}) {
  const requirements = caseItem.mitigationRequirements ?? [];
  const evidenceCount = caseItem.evidenceItems?.length ?? 0;

  return (
    <div className="rounded-2xl border-2 border-clay/30 bg-gradient-to-br from-clay/8 to-off-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-clay-dark">Action required</p>
          <h3 className="mt-1 font-display text-xl font-bold text-charcoal">{caseItem.caseNumber}</h3>
        </div>
        <CaseStatusBadge status={caseItem.status} />
      </div>

      {requirements.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm text-charcoal-muted">
          {requirements.map((req) => (
            <li key={req} className="flex gap-2">
              <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-clay-dark" />
              {req}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-charcoal-muted">
        <span className="inline-flex items-center gap-1">
          <Upload className="h-3.5 w-3.5" />
          {evidenceCount} file{evidenceCount === 1 ? '' : 's'} submitted
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Updated {formatRelativeDate(caseItem.updatedAt)}
        </span>
      </div>

      <Link to={`/developer/cases/${caseItem.id}`} className="mt-4 block">
        <Button variant="secondary" size="md" className="w-full">
          Upload evidence
        </Button>
      </Link>
    </div>
  );
}
