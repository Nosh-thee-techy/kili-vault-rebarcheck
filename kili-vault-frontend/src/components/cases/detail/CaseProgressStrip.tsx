import { PROCESS_STEPS } from '@/lib/caseWorkflowGuide';

export function CaseProgressStrip({ activeIndex }: { activeIndex: number }) {
  return (
    <nav aria-label="Case progress">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {PROCESS_STEPS.map((label, index) => {
          const done = index < activeIndex;
          const current = index === activeIndex;
          return (
            <li key={label} className="flex items-center gap-2">
              <calcite-chip
                kind={current ? 'brand' : 'neutral'}
                icon={done ? 'check' : undefined}
                scale="s"
                aria-current={current ? 'step' : undefined}
              >
                {label}
              </calcite-chip>
              {index < PROCESS_STEPS.length - 1 && (
                <calcite-icon icon="chevron-right" scale="s" className="text-charcoal-muted" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
