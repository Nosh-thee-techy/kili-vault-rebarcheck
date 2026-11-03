import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-forest text-off-white hover:bg-forest-light active:bg-forest-dark disabled:bg-sage disabled:text-off-white/70',
  secondary:
    'bg-clay text-off-white hover:bg-clay-light active:bg-clay-dark disabled:bg-sand disabled:text-charcoal-muted',
  ghost:
    'bg-transparent text-forest hover:bg-mist/60 active:bg-sand disabled:text-charcoal-muted',
  danger:
    'bg-risk-high text-off-white hover:opacity-90 active:opacity-100 disabled:bg-sand disabled:text-charcoal-muted',
  outline:
    'border-2 border-forest/20 bg-off-white text-forest hover:border-forest/40 hover:bg-sand/50 active:bg-sand disabled:border-sand disabled:text-charcoal-muted',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
  icon: 'h-11 w-11 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-off-white',
        'disabled:cursor-not-allowed disabled:opacity-80',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  ),
);

Button.displayName = 'Button';
