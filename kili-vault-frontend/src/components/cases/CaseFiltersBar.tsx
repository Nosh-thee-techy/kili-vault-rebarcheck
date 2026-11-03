import { CASE_STATUS_LABELS, CHANGE_TYPE_LABELS } from '@/config/theme';
import { cn } from '@/lib/cn';
import type { CaseStatus, ChangeType } from '@/types';

export interface CaseFilters {
  status?: CaseStatus | 'ALL';
  changeType?: ChangeType | 'ALL';
  search?: string;
}

interface CaseFiltersBarProps {
  filters: CaseFilters;
  onChange: (filters: CaseFilters) => void;
  className?: string;
}

export function CaseFiltersBar({ filters, onChange, className }: CaseFiltersBarProps) {
  return (
    <div className={cn('grid gap-3 md:grid-cols-[minmax(14rem,1fr)_minmax(10rem,14rem)_minmax(11rem,16rem)]', className)}>
      <calcite-label scale="m" className="block min-w-0">
        Search cases
        <calcite-input
          scale="m"
          icon="search"
          placeholder="Case number or parcel"
          value={filters.search ?? ''}
          oncalciteInputInput={(event) =>
            onChange({
              ...filters,
              search: (event.currentTarget as HTMLElement & { value: string }).value,
            })
          }
        />
      </calcite-label>

      <calcite-label scale="m" className="block min-w-0">
        Status
        <calcite-select
          scale="m"
          value={filters.status ?? 'ALL'}
          oncalciteSelectChange={(event) =>
            onChange({
              ...filters,
              status: (event.target as HTMLElement & { value: string }).value as CaseStatus | 'ALL',
            })
          }
        >
          <calcite-option value="ALL">All statuses</calcite-option>
          {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((status) => (
            <calcite-option key={status} value={status}>
              {CASE_STATUS_LABELS[status]}
            </calcite-option>
          ))}
        </calcite-select>
      </calcite-label>

      <calcite-label scale="m" className="block min-w-0">
        Change type
        <calcite-select
          scale="m"
          value={filters.changeType ?? 'ALL'}
          oncalciteSelectChange={(event) =>
            onChange({
              ...filters,
              changeType: (event.target as HTMLElement & { value: string }).value as ChangeType | 'ALL',
            })
          }
        >
          <calcite-option value="ALL">All change types</calcite-option>
          {(Object.keys(CHANGE_TYPE_LABELS) as ChangeType[]).map((type) => (
            <calcite-option key={type} value={type}>
              {CHANGE_TYPE_LABELS[type]}
            </calcite-option>
          ))}
        </calcite-select>
      </calcite-label>
    </div>
  );
}
