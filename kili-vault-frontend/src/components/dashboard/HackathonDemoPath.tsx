import { useState } from 'react';
import { ChevronRight, Lightbulb, Play, X } from 'lucide-react';
import { PRESENTER_STEPS } from '@/config/demoScript';
import { getDemoRoleLabel, usePresenter } from '@/context/PresenterContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'kili-vault-demo-path-dismissed';

export function HackathonDemoPath({
  className,
  spotlightCaseId,
}: {
  className?: string;
  spotlightCaseId?: string;
}) {
  const { start, isActive } = usePresenter();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === '1',
  );
  const [expanded, setExpanded] = useState(true);
  const [starting, setStarting] = useState(false);

  if (dismissed && !isActive) return null;

  const handleStart = async () => {
    setStarting(true);
    try {
      await start(spotlightCaseId);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-forest/20 bg-gradient-to-r from-forest/8 via-off-white to-clay/5 p-4 shadow-soft md:p-5',
        isActive && 'ring-2 ring-clay/40',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest text-off-white">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest">
              Judge demo path
            </p>
            <p className="mt-0.5 text-sm font-medium text-charcoal">
              Proof-of-compliance in 7 guided steps · Detect → Close
            </p>
            <p className="mt-1 text-xs text-charcoal-muted">
              Presenter mode auto-switches roles and navigates — you perform each action live.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="primary"
            size="md"
            className="gap-2"
            isLoading={starting}
            onClick={handleStart}
          >
            <Play className="h-4 w-4" />
            Start guided demo
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => {
              sessionStorage.setItem(STORAGE_KEY, '1');
              setDismissed(true);
            }}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {PRESENTER_STEPS.map((step, i) => (
            <li
              key={step.id}
              className="rounded-xl border border-sand/80 bg-off-white/80 px-3 py-2.5 backdrop-blur-sm"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-sage">
                {i + 1} · {getDemoRoleLabel(step.requiredRole)}
              </span>
              <p className="mt-1 text-xs font-semibold text-charcoal">{step.title}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
