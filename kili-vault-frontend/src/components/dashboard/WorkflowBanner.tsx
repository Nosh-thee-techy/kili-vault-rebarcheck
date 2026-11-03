import { WORKFLOW_STEPS } from '@/config/theme';

export function WorkflowBanner() {
  return (
    <section className="overflow-hidden rounded-2xl border border-forest/15 bg-gradient-to-br from-forest via-forest-light to-forest-dark p-6 text-off-white shadow-lift md:p-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-off-white/70">
          Kilimani Ward · Nairobi
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">
          Spatial development accountability
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-off-white/85 md:text-base">
          AI detects physical change. GIS assesses planning and infrastructure context. Humans verify.
          Evidence creates accountability — never autonomous enforcement.
        </p>
      </div>

      <ol className="mt-6 flex flex-wrap gap-2 md:gap-3">
        {WORKFLOW_STEPS.map((step, index) => (
          <li
            key={step.key}
            className="flex items-center gap-2 rounded-full bg-off-white/12 px-3 py-2 text-xs font-semibold backdrop-blur-sm md:text-sm"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-clay text-[11px] font-bold text-off-white">
              {index + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
    </section>
  );
}
