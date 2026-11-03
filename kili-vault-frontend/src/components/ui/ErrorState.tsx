import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: 'network' | 'generic';
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  variant = 'generic',
  className,
  compact = false,
}: ErrorStateProps) {
  const Icon = variant === 'network' ? WifiOff : AlertTriangle;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-clay/25 bg-gradient-to-b from-clay/5 to-off-white text-center',
        compact ? 'px-4 py-8' : 'px-6 py-12',
        className,
      )}
      role="alert"
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-2xl bg-clay/10 ring-1 ring-clay/20',
          compact ? 'h-12 w-12' : 'h-16 w-16',
        )}
      >
        <Icon className={cn('text-clay-dark', compact ? 'h-6 w-6' : 'h-8 w-8')} strokeWidth={1.5} />
      </div>
      <h3 className={cn('font-display font-semibold text-charcoal', compact ? 'text-lg' : 'text-xl')}>
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-charcoal-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="md" className="mt-6 gap-2" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
