import { useState } from 'react';
import { AlertTriangle, ChevronDown, Info } from 'lucide-react';
import { buildCaseFlaggingReasons } from '@/lib/caseFlaggingReasons';
import { cn } from '@/lib/cn';
import type { DevelopmentCase } from '@/types';

export function CaseFlaggingSummary({ caseItem }: { caseItem: DevelopmentCase }) {
  const [expanded, setExpanded] = useState(false);
  const reasons = buildCaseFlaggingReasons(caseItem);
  const visible = expanded ? reasons : reasons.slice(0, 3);
  const hiddenCount = reasons.length - 3;

  return (
    <div className="rounded-2xl border border-sand bg-off-white p-5">
      <h3 className="text-sm font-semibold text-charcoal">Why it was flagged</h3>
      <ul className="mt-3 space-y-2">
        {visible.map((reason) => {
          const Icon = reason.severity === 'info' ? Info : AlertTriangle;
          return (
            <li
              key={`${reason.category}-${reason.text}`}
              className="flex gap-2.5 text-sm leading-relaxed text-charcoal"
            >
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  reason.severity === 'info' ? 'text-sage' : 'text-clay-dark',
                )}
                strokeWidth={1.75}
              />
              <span>{reason.text}</span>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-clay-dark hover:text-clay"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show ${hiddenCount} more reason${hiddenCount === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  );
}
