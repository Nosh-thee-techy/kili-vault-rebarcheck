import { getDemoRoleLabel, usePresenter } from '@/context/PresenterContext';

const guideShellClass =
  'fixed z-[70] border border-[var(--calcite-color-border-1)] bg-[var(--calcite-color-background)] text-[var(--calcite-color-text-1)] shadow-lg inset-x-3 bottom-20 md:inset-x-auto md:bottom-6 md:right-6 md:w-[min(100%,420px)] lg:bottom-8';

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
        className={`${guideShellClass} flex items-center gap-2 p-2`}
        role="dialog"
        aria-label="Guided demo presenter (minimized)"
      >
        <calcite-button
          className="min-w-0 flex-1"
          appearance="transparent"
          scale="s"
          icon-start="presentation"
          icon-end="chevron-up"
          onClick={toggleMinimized}
          aria-label="Expand guided demo"
        >
          <span className="block truncate text-left">
            Step {stepIndex + 1}/{totalSteps} · {step.title}
          </span>
        </calcite-button>
        <calcite-button
          appearance="transparent"
          scale="s"
          icon-start="x"
          onClick={exit}
          aria-label="Exit guided demo"
        />
      </aside>
    );
  }

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[60] bg-black/20 md:bg-black/10"
        aria-hidden="true"
      />
      <aside
        className={guideShellClass}
        role="dialog"
        aria-label="Guided demo presenter"
        aria-modal="false"
      >
        <calcite-progress
          type="determinate"
          value={String(progress)}
          aria-label={`Guided demo step ${stepIndex + 1} of ${totalSteps}`}
        />
        <div className="p-4 md:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <calcite-chip scale="s" appearance="outline" icon="presentation">
                Guided demo · Step {stepIndex + 1}/{totalSteps}
              </calcite-chip>
              <p className="mt-1 text-xs text-[var(--calcite-color-text-2)]">
                {getDemoRoleLabel(step.requiredRole)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <calcite-button
                appearance="transparent"
                scale="s"
                icon-start="chevron-down"
                onClick={toggleMinimized}
                aria-label="Minimize guided demo"
              />
              <calcite-button
                appearance="transparent"
                scale="s"
                icon-start="x"
                onClick={exit}
                aria-label="Exit guided demo"
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold">{step.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--calcite-color-text-2)]">
            {step.instruction}
          </p>

          <calcite-block className="mt-3" heading="Your action" open>
            <p className="text-sm font-medium">{step.actionHint}</p>
          </calcite-block>

          <div className="mt-4 flex items-center justify-between gap-2">
            <calcite-button
              appearance="outline"
              scale="s"
              icon-start="chevron-left"
              onClick={prev}
              disabled={stepIndex === 0}
            >
              Back
            </calcite-button>
            <calcite-button
              appearance="solid"
              scale="s"
              icon-end="chevron-right"
              onClick={stepIndex >= totalSteps - 1 ? exit : next}
            >
              {stepIndex >= totalSteps - 1 ? 'Finish demo' : 'Next step'}
            </calcite-button>
          </div>
        </div>
      </aside>
    </>
  );
}
