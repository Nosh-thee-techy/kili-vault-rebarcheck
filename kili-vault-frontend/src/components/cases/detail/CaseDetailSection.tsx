import type { ReactNode } from 'react';

export function CaseDetailSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-sand pb-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-sage">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-charcoal-muted">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
