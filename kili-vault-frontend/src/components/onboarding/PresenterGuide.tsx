import { getDemoRoleLabel, usePresenter } from '@/context/PresenterContext';

const guideShellClass =
  'fixed inset-x-3 bottom-20 z-[70] max-h-[calc(100dvh-6rem)] overflow-y-auto text-[var(--calcite-color-text-1)] md:inset-x-auto md:bottom-6 md:right-6 md:w-[min(100%,420px)] lg:bottom-8';

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
        className={guideShellClass}
        role="dialog"
        aria-label="Guided demo presenter (minimized)"
      >
        <calcite-card>
          <span slot="heading" className="flex items-center gap-2">
            <calcite-icon icon="presentation" scale="s" />
            Guided demo
          </span>
          <span slot="description" className="block truncate">
            Step {stepIndex + 1}/{totalSteps} · {step.title}
          </span>
          <div slot="footer-end" className="flex items-center gap-1">
            <calcite-button
              appearance="transparent"
              scale="s"
              icon-start="chevron-up"
              onClick={toggleMinimized}
              aria-label="Expand guided demo"
            />
            <calcite-button
              appearance="transparent"
              scale="s"
              icon-start="x"
              onClick={exit}
              aria-label="Exit guided demo"
            />
          </div>
        </calcite-card>
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
        <calcite-card>
          <span slot="heading" className="flex w-full items-center justify-between gap-2">
            <span>Guided demo</span>
            <span className="flex shrink-0 items-center gap-1">
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
            </span>
          </span>
          <span slot="description">
            Step {stepIndex + 1} of {totalSteps} · {getDemoRoleLabel(step.requiredRole)}
          </span>
          <div className="space-y-3">
            <calcite-progress
              type="determinate"
              value={String(progress)}
              aria-label={`Guided demo step ${stepIndex + 1} of ${totalSteps}`}
            />
            <div>
              <h2 className="text-base font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--calcite-color-text-2)]">
                {step.instruction}
              </p>
            </div>
            <calcite-block heading="Your action" open>
              <p className="text-sm font-medium">{step.actionHint}</p>
            </calcite-block>
          </div>
          <span slot="footer-start" className="text-xs text-[var(--calcite-color-text-2)]">
            {stepIndex + 1} / {totalSteps}
          </span>
          <span slot="footer-end" className="flex items-center gap-2">
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
          </span>
        </calcite-card>
      </aside>
    </>
  );
}
