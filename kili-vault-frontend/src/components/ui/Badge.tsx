import { cn } from '@/lib/cn';

type BadgeVariant = 'default' | 'forest' | 'clay' | 'risk-high' | 'risk-medium' | 'risk-low' | 'muted';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dotColor?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-sand text-charcoal',
  forest: 'bg-forest/10 text-forest',
  clay: 'bg-clay/15 text-clay-dark',
  'risk-high': 'bg-risk-high/12 text-risk-high',
  'risk-medium': 'bg-clay/15 text-clay-dark',
  'risk-low': 'bg-risk-low/12 text-risk-low',
  muted: 'bg-sand/80 text-charcoal-muted',
};

export function Badge({ children, variant = 'default', className, dotColor }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide',
        variantStyles[variant],
        className,
      )}
    >
      {dotColor && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
