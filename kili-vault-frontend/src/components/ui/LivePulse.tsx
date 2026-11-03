import { cn } from '@/lib/cn';

export function LivePulse({ label = 'Live', className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-forest/20 bg-forest/8 px-2.5 py-1',
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-clay" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-forest">{label}</span>
    </span>
  );
}
