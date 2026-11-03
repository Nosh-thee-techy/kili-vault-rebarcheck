import { AlertTriangle, Flag, Info } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import {
  buildCaseFlaggingReasons,
  type FlaggingReason,
  type FlaggingReasonSeverity,
} from '@/lib/caseFlaggingReasons';
import type { DevelopmentCase } from '@/types';

const SEVERITY_STYLES: Record<
  FlaggingReasonSeverity,
  { row: string; icon: typeof AlertTriangle; iconClass: string }
> = {
  critical: {
    row: 'border-clay/35 bg-clay/12',
    icon: AlertTriangle,
    iconClass: 'text-clay-dark',
  },
  warning: {
    row: 'border-clay/25 bg-clay/8',
    icon: AlertTriangle,
    iconClass: 'text-clay-dark',
  },
  info: {
    row: 'border-forest/20 bg-forest/5',
    icon: Info,
    iconClass: 'text-forest',
  },
};

function ReasonRow({ reason }: { reason: FlaggingReason }) {
  const style = SEVERITY_STYLES[reason.severity];
  const Icon = style.icon;

  return (
    <li className={cn('flex gap-3 rounded-xl border px-3.5 py-2.5', style.row)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.iconClass)} strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
          {reason.category}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-charcoal">{reason.text}</p>
      </div>
    </li>
  );
}

export function CaseFlaggingReasonsCard({ caseItem }: { caseItem: DevelopmentCase }) {
  const reasons = buildCaseFlaggingReasons(caseItem);
  const criticalCount = reasons.filter((r) => r.severity === 'critical').length;

  return (
    <Card padding="md" className="border-clay/20 bg-gradient-to-br from-clay/[0.04] to-off-white">
      <CardHeader
        title="Why this case was flagged"
        description={
          caseItem.evidence?.preDevelopment
            ? 'Self-reported pre-development indicators that triggered review.'
            : 'Kili-Shadows detection signals that led to this case — not a legal finding.'
        }
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-clay/15 px-3 py-1 text-xs font-semibold text-clay-dark">
            <Flag className="h-3.5 w-3.5" />
            {reasons.length} reason{reasons.length === 1 ? '' : 's'}
            {criticalCount > 0 && ` · ${criticalCount} critical`}
          </span>
        }
      />
      <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {reasons.map((reason) => (
          <ReasonRow key={`${reason.category}-${reason.text}`} reason={reason} />
        ))}
      </ul>
    </Card>
  );
}
