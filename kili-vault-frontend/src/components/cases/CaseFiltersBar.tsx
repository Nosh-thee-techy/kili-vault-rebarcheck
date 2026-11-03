import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { CASE_STATUS_LABELS, CHANGE_TYPE_LABELS } from '@/config/theme';
import type { CaseStatus, ChangeType } from '@/types';

export interface CaseFilters {
  status?: CaseStatus | 'ALL';
  changeType?: ChangeType | 'ALL';
  search?: string;
}
import { cn } from '@/lib/cn';

interface CaseFiltersBarProps {
  filters: CaseFilters;
  onChange: (filters: CaseFilters) => void;
  className?: string;
}

export function CaseFiltersBar({ filters, onChange, className }: CaseFiltersBarProps) {
  return (
    <div className={cn('grid gap-3 md:grid-cols-[1fr_auto_auto]', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
        <Input
          placeholder="Search by case ID or parcel…"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-10"
          aria-label="Search cases"
        />
      </div>

      <label className="relative min-w-[160px]">
        <span className="sr-only">Filter by status</span>
        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
        <select
          value={filters.status ?? 'ALL'}
          onChange={(e) =>
            onChange({
              ...filters,
              status: e.target.value as CaseStatus | 'ALL',
            })
          }
          className="h-11 w-full appearance-none rounded-xl border border-sand bg-off-white pl-10 pr-8 text-sm text-charcoal transition-colors hover:border-sage focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
        >
          <option value="ALL">All statuses</option>
          {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((status) => (
            <option key={status} value={status}>
              {CASE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <label className="relative min-w-[180px]">
        <span className="sr-only">Filter by change type</span>
        <select
          value={filters.changeType ?? 'ALL'}
          onChange={(e) =>
            onChange({
              ...filters,
              changeType: e.target.value as ChangeType | 'ALL',
            })
          }
          className="h-11 w-full appearance-none rounded-xl border border-sand bg-off-white px-4 text-sm text-charcoal transition-colors hover:border-sage focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
        >
          <option value="ALL">All change types</option>
          {(Object.keys(CHANGE_TYPE_LABELS) as ChangeType[]).map((type) => (
            <option key={type} value={type}>
              {CHANGE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
