import { cn } from '@/lib/cn';

interface LogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

/** Kili-Vault brand mark. The browser tab uses the Calcite map icon. */
export function Logo({ size = 36, className, alt = 'Kili-Vault' }: LogoProps) {
  return (
    <img
      src="/kili-vault-mark.svg"
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 select-none', className)}
      draggable={false}
    />
  );
}
