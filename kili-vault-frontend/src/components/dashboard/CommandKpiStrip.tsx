import { AlertTriangle, CheckCircle2, Eye, ShieldAlert } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/cn';

const items = [
  { key: 'total', label: 'Active', icon: Eye, color: 'text-forest' },
  { key: 'aiFlagged', label: 'AI flagged', icon: Eye, color: 'text-clay-dark' },
  { key: 'highRisk', label: 'High risk', icon: AlertTriangle, color: 'text-risk-high' },
  { key: 'mitigationRequired', label: 'Mitigation', icon: ShieldAlert, color: 'text-clay-dark' },
  { key: 'closed', label: 'Closed', icon: CheckCircle2, color: 'text-risk-low' },
] as const;

export function CommandKpiStrip({
  stats,
  className,
}: {
  stats: Record<(typeof items)[number]['key'], number>;
  className?: string;
}) {
  return (
    <GlassPanel className={cn('overflow-x-auto', className)} padding="sm">
      <div className="flex min-w-max divide-x divide-sand/80">
        {items.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="flex items-center gap-3 px-4 py-1 first:pl-0 last:pr-0 md:px-5">
            <Icon className={cn('h-4 w-4 shrink-0', color)} strokeWidth={1.75} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
                {label}
              </p>
              <p className="font-display text-xl font-bold tabular-nums text-charcoal">
                {stats[key] ?? 0}
              </p>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
