import { cn } from '@/lib/cn';

interface LogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

/** Same mark as `/favicon.svg` (browser tab icon). */
export function Logo({ size = 36, className, alt = 'Kili-Vault' }: LogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 select-none', className)}
      draggable={false}
    />
  );
}
