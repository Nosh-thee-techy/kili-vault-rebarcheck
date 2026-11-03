import { type LucideIcon, MapPinOff, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = MapPinOff,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-sage/50 bg-gradient-to-b from-off-white to-sand/30 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-forest/8 ring-1 ring-forest/10">
        <Icon className="h-8 w-8 text-forest" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-xl font-semibold text-charcoal">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-charcoal-muted">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="md" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function NoSearchResults({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      title="No cases match your filters"
      description="Try adjusting the status, change type, or search term to find development cases in Kilimani."
      actionLabel="Clear filters"
      onAction={onClear}
    />
  );
}
