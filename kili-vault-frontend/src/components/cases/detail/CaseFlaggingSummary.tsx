import { useState } from 'react';
import { buildCaseFlaggingReasons } from '@/lib/caseFlaggingReasons';
import type { DevelopmentCase } from '@/types';

export function CaseFlaggingSummary({ caseItem }: { caseItem: DevelopmentCase }) {
  const [expanded, setExpanded] = useState(false);
  const reasons = buildCaseFlaggingReasons(caseItem);
  const visible = expanded ? reasons : reasons.slice(0, 3);
  const hiddenCount = reasons.length - 3;

  return (
    <calcite-panel heading="Assessment" description="Why this case was flagged.">
      <ul className="space-y-3 p-4">
        {visible.map((reason) => (
          <li
            key={`${reason.category}-${reason.text}`}
            className="flex items-start gap-3 text-sm leading-relaxed text-charcoal"
          >
            <calcite-icon
              icon={reason.severity === 'info' ? 'information' : 'exclamation-mark-triangle'}
              scale="s"
              className="mt-0.5 shrink-0 text-charcoal-muted"
              aria-hidden="true"
            />
            <span>{reason.text}</span>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <div className="border-t border-sand px-4 py-2">
          <calcite-button
            appearance="transparent"
            scale="s"
            icon-start={expanded ? 'chevron-up' : 'chevron-down'}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Show fewer reasons' : `Show ${hiddenCount} more reason${hiddenCount === 1 ? '' : 's'}`}
          </calcite-button>
        </div>
      )}
    </calcite-panel>
  );
}
