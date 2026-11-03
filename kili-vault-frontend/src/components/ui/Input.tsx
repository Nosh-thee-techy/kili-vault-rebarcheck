import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full rounded-xl border bg-off-white px-4 text-sm text-charcoal transition-colors',
            'placeholder:text-charcoal-muted/60',
            'hover:border-sage',
            'focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15',
            'disabled:cursor-not-allowed disabled:bg-sand/50 disabled:text-charcoal-muted',
            error ? 'border-risk-high' : 'border-sand',
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="mt-1.5 text-xs text-charcoal-muted">{hint}</p>}
        {error && <p className="mt-1.5 text-xs font-medium text-risk-high">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
