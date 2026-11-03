import { cn } from '@/lib/cn';

export function GlassPanel({
  children,
  className,
  padding = 'md',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md';
}) {
  const pad = { none: '', sm: 'p-3', md: 'p-4 md:p-5' };
  return (
    <div
      className={cn(
        'glass-panel rounded-2xl border border-off-white/40 shadow-lift backdrop-blur-xl',
        pad[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
