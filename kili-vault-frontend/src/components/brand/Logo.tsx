import { cn } from '@/lib/cn';

interface LogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

/** Shared Calcite map mark used in the browser tab and application shell. */
export function Logo({ size = 36, className, alt = 'Kili-Vault' }: LogoProps) {
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center bg-[var(--calcite-color-foreground-2)] text-[var(--calcite-color-text-1)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <calcite-icon icon="map" scale="l" />
    </span>
  );
}
