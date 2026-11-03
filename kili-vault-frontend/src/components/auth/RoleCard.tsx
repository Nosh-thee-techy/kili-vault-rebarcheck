import { ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface RoleCardProps {
  label: string;
  subtitle: string;
  persona: string;
  description: string;
  icon: LucideIcon;
  accent: 'forest' | 'clay' | 'sage' | 'teal';
  onSelect: () => void;
  delay?: number;
  variant?: 'default' | 'compact' | 'visual';
  imageSrc?: string;
  imageAlt?: string;
  isActive?: boolean;
  onHover?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

const accentStyles = {
  forest: {
    card: 'border-forest/15 bg-off-white hover:border-forest/40',
    icon: 'bg-forest/10 text-forest group-hover:bg-forest group-hover:text-off-white',
    iconActive: 'bg-forest text-off-white',
    ring: 'group-focus-visible:ring-forest/30',
    cta: 'bg-forest text-off-white hover:bg-forest-light',
    active: 'border-forest ring-2 ring-forest/25 shadow-lift',
  },
  clay: {
    card: 'border-clay/20 bg-off-white hover:border-clay/45',
    icon: 'bg-clay/12 text-clay-dark group-hover:bg-clay group-hover:text-off-white',
    iconActive: 'bg-clay text-off-white',
    ring: 'group-focus-visible:ring-clay/30',
    cta: 'bg-clay text-off-white hover:bg-clay-light',
    active: 'border-clay ring-2 ring-clay/25 shadow-lift',
  },
  sage: {
    card: 'border-sage/30 bg-off-white hover:border-sage/55',
    icon: 'bg-mist text-forest group-hover:bg-forest group-hover:text-off-white',
    iconActive: 'bg-forest text-off-white',
    ring: 'group-focus-visible:ring-sage/40',
    cta: 'bg-forest/90 text-off-white hover:bg-forest',
    active: 'border-sage ring-2 ring-sage/30 shadow-lift',
  },
  teal: {
    card: 'border-risk-low/25 bg-off-white hover:border-risk-low/45',
    icon: 'bg-risk-low/12 text-risk-low group-hover:bg-risk-low group-hover:text-off-white',
    iconActive: 'bg-risk-low text-off-white',
    ring: 'group-focus-visible:ring-risk-low/30',
    cta: 'bg-risk-low text-off-white hover:opacity-90',
    active: 'border-risk-low ring-2 ring-risk-low/25 shadow-lift',
  },
};

export function RoleCard({
  label,
  subtitle,
  persona,
  description,
  icon: Icon,
  accent,
  onSelect,
  delay = 0,
  variant = 'default',
  imageSrc,
  imageAlt,
  isActive = false,
  onHover,
  onFocus,
  onBlur,
}: RoleCardProps) {
  const styles = accentStyles[accent];
  const compact = variant === 'compact';
  const visual = variant === 'visual';

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        'group login-card-animate flex h-full flex-col overflow-hidden text-left',
        'transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        visual
          ? 'rounded-2xl border shadow-soft hover:-translate-y-1'
          : compact
            ? 'rounded-xl border p-4 shadow-soft hover:-translate-y-0.5 hover:shadow-lift'
            : 'rounded-2xl border p-5 shadow-soft hover:-translate-y-1 hover:shadow-lift',
        styles.card,
        styles.ring,
        (isActive || visual) && isActive && styles.active,
      )}
    >
      {visual && imageSrc && (
        <div className="relative h-24 overflow-hidden sm:h-28">
          <img
            src={imageSrc}
            alt={imageAlt ?? label}
            className={cn(
              'h-full w-full object-cover transition-transform duration-500',
              isActive ? 'scale-110' : 'scale-100 group-hover:scale-105',
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent" />
          <span className="absolute bottom-2 left-3 rounded-full bg-off-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-charcoal">
            Demo
          </span>
        </div>
      )}

      <div className={cn('flex flex-col', visual ? 'p-3.5 sm:p-4' : compact ? '' : '')}>
        <div className={cn('flex items-center gap-3', !compact && !visual && 'items-start justify-between')}>
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-xl transition-all duration-300',
              visual || compact ? 'h-9 w-9' : 'h-11 w-11',
              isActive && visual ? styles.iconActive : styles.icon,
            )}
          >
            <Icon className={cn(visual || compact ? 'h-4 w-4' : 'h-5 w-5')} strokeWidth={1.75} />
          </div>
          {!compact && !visual && (
            <span className="rounded-full border border-sand bg-off-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
              Demo
            </span>
          )}
          {(compact || visual) && (
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-bold text-charcoal">{label}</h2>
              <p className="truncate text-xs text-charcoal-muted">{subtitle}</p>
            </div>
          )}
          {(compact || visual) && (
            <ArrowRight
              className={cn(
                'h-4 w-4 shrink-0 text-charcoal-muted transition-all',
                isActive ? 'translate-x-0.5 opacity-100 text-forest' : 'opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100',
              )}
            />
          )}
        </div>

        {!compact && !visual && (
          <>
            <div className="mt-4 flex-1">
              <h2 className="font-display text-xl font-bold text-charcoal">{label}</h2>
              <p className="mt-0.5 text-sm font-medium text-charcoal-muted">{subtitle}</p>
              <p className="mt-1 text-xs text-sage">Signed in as {persona}</p>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-muted">{description}</p>
            </div>

            <span
              className={cn(
                'mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5',
                'text-sm font-semibold transition-all duration-300',
                styles.cta,
              )}
            >
              Continue
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </>
        )}
      </div>
    </button>
  );
}
