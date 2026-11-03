import { AlertTriangle, CheckCircle2, Eye, ShieldAlert } from 'lucide-react';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

interface StatItem {
  label: string;
  value: number;
  hint: string;
  icon: React.ElementType;
  accent: 'forest' | 'clay' | 'risk-high' | 'sage';
}

const accentStyles = {
  forest: 'bg-forest/10 text-forest',
  clay: 'bg-clay/12 text-clay-dark',
  'risk-high': 'bg-risk-high/10 text-risk-high',
  sage: 'bg-mist text-forest',
};

export function StatsGrid({
  stats,
  isLoading,
}: {
  stats: {
    total: number;
    aiFlagged: number;
    underReview: number;
    mitigationRequired: number;
    pendingVerification: number;
    highRisk: number;
    closed: number;
  };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const items: StatItem[] = [
    {
      label: 'Active cases',
      value: stats.total,
      hint: `${stats.aiFlagged} AI-flagged awaiting review`,
      icon: Eye,
      accent: 'forest',
    },
    {
      label: 'High risk',
      value: stats.highRisk,
      hint: 'Priority spatial indicators',
      icon: AlertTriangle,
      accent: 'risk-high',
    },
    {
      label: 'Mitigation required',
      value: stats.mitigationRequired,
      hint: `${stats.pendingVerification} pending verification`,
      icon: ShieldAlert,
      accent: 'clay',
    },
    {
      label: 'Closed / verified',
      value: stats.closed,
      hint: `${stats.underReview} currently under review`,
      icon: CheckCircle2,
      accent: 'sage',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-2xl border border-sand bg-off-white p-5 shadow-soft transition-shadow hover:shadow-lift md:p-6"
        >
          <div className="mb-4 flex items-start justify-between">
            <p className="text-sm font-medium text-charcoal-muted">{item.label}</p>
            <div className={cn('rounded-xl p-2.5', accentStyles[item.accent])}>
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="font-display text-3xl font-bold text-charcoal">{item.value}</p>
          <p className="mt-2 text-xs leading-relaxed text-charcoal-muted">{item.hint}</p>
        </article>
      ))}
    </div>
  );
}
