import { cn } from '@/lib/cn';
import { PROCESS_STEPS } from '@/lib/caseWorkflowGuide';

export function CaseProgressStrip({ activeIndex }: { activeIndex: number }) {
  return (
    <nav aria-label="Case progress" className="flex items-center justify-between gap-1">
      {PROCESS_STEPS.map((label, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span
              className={cn(
                'flex h-2.5 w-2.5 shrink-0 rounded-full transition-colors',
                done && 'bg-sage',
                current && 'bg-clay ring-4 ring-clay/20',
                !done && !current && 'bg-sand',
              )}
            />
            <span
              className={cn(
                'hidden truncate text-center text-[10px] font-semibold sm:block',
                current ? 'text-clay-dark' : done ? 'text-charcoal-muted' : 'text-charcoal-muted/60',
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
