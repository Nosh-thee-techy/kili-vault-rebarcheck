import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Presentation, X } from 'lucide-react';
import { getDemoRoleLabel, usePresenter } from '@/context/PresenterContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const guideShellClass = cn(
  'presenter-guide fixed z-[70] border border-forest/20 bg-off-white shadow-lift',
  'inset-x-3 bottom-20 rounded-2xl md:inset-x-auto md:bottom-6 md:right-6 md:w-[min(100%,420px)]',
  'lg:bottom-8',
);

export function PresenterGuide() {
  const {
    isActive,
    isMinimized,
    step,
    stepIndex,
    totalSteps,
    next,
    prev,
    exit,
    toggleMinimized,
  } = usePresenter();

  if (!isActive || !step) return null;

  const progress = ((stepIndex + 1) / totalSteps) * 100;

  if (isMinimized) {
    return (
      <aside
        className={cn(guideShellClass, 'flex items-center gap-2 p-2.5 md:p-3')}
        role="dialog"
        aria-label="Guided demo presenter (minimized)"
      >
        <button
          type="button"
          onClick={toggleMinimized}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-mist/50"
          aria-label="Expand guided demo"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest/10 text-forest">
            <Presentation className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-charcoal">
              Step {stepIndex + 1}/{totalSteps} · {step.title}
            </p>
            <p className="truncate text-[10px] text-charcoal-muted">{getDemoRoleLabel(step.requiredRole)}</p>
          </div>
          <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-charcoal-muted" />
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={exit} aria-label="Exit guided demo">
          <X className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[60] bg-charcoal/20 backdrop-blur-[1px] md:bg-charcoal/10"
        aria-hidden
      />

      <aside
        className={guideShellClass}
        role="dialog"
        aria-label="Guided demo presenter"
      >
        <div className="h-1 overflow-hidden rounded-t-2xl bg-sand">
          <div
            className="h-full bg-gradient-to-r from-forest to-clay transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 text-forest">
                <Presentation className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-sage">
                  Guided demo · Step {stepIndex + 1}/{totalSteps}
                </p>
                <p className="text-xs font-medium text-charcoal-muted">
                  {getDemoRoleLabel(step.requiredRole)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleMinimized}
                aria-label="Minimize guided demo"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exit} aria-label="Exit guided demo">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <h3 className="font-display text-lg font-bold text-charcoal">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">{step.instruction}</p>

          <div className="mt-3 rounded-xl border border-clay/25 bg-clay/5 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-clay-dark">Your action</p>
            <p className="mt-0.5 text-sm font-medium text-charcoal">{step.actionHint}</p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prev}
              disabled={stepIndex === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={stepIndex >= totalSteps - 1 ? exit : next}
              className="gap-1"
            >
              {stepIndex >= totalSteps - 1 ? 'Finish demo' : 'Next step'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
