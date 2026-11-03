import { LivePulse } from '@/components/ui/LivePulse';
import { cn } from '@/lib/cn';

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  live?: boolean;
  liveLabel?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  live = false,
  liveLabel = 'Live',
  action,
  className,
}: PageHeroProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">{eyebrow}</p>
          {live && <LivePulse label={liveLabel} />}
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight text-charcoal md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-muted md:text-[15px]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
