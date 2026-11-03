import { AlertCircle, Building2, Droplets, Info, Route, TreePine } from 'lucide-react';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatChangeType } from '@/lib/format';
import type { ChangeType, PreDevFlag, RiskBreakdown } from '@/types';

function RiskMeter({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-sand bg-off-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-charcoal">
          <Icon className="h-4 w-4 text-forest" strokeWidth={1.75} />
          {label}
        </div>
        <span className="text-sm font-bold text-charcoal">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sand">
        <div
          className="risk-bar h-full rounded-full bg-gradient-to-r from-forest to-clay"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function ProjectedRiskPanel({
  title,
  changeType,
  risk,
  flags,
  disclaimer,
  coordinates,
}: {
  title: string;
  changeType: ChangeType;
  risk: RiskBreakdown;
  flags: PreDevFlag[];
  disclaimer: string;
  coordinates?: { lat: number; lon: number };
}) {
  return (
    <Card padding="md" className="border-clay/25 bg-gradient-to-br from-clay/[0.06] to-off-white">
      <CardHeader
        title="Projected risk — pre-development"
        description="Hypothetical assessment before work starts. Not a permit or legal clearance."
      />
      <div className="mb-4 rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-xs leading-relaxed text-clay-dark">
        <strong className="font-semibold">Informational only.</strong> {disclaimer}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RiskBadge level={risk.overall} />
        <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-charcoal">
          {formatChangeType(changeType)}
        </span>
      </div>

      <p className="mb-4 text-sm font-medium text-charcoal">{title}</p>
      {coordinates && (
        <p className="mb-4 font-mono text-xs text-charcoal-muted">
          Pin: {coordinates.lat.toFixed(5)}, {coordinates.lon.toFixed(5)}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <RiskMeter label="Planning" value={risk.planning} icon={Building2} />
        <RiskMeter label="Infrastructure" value={risk.infrastructure} icon={Route} />
        <RiskMeter label="Environmental" value={risk.environmental} icon={TreePine} />
        <RiskMeter label="Community" value={risk.community} icon={Droplets} />
      </div>

      {flags.length > 0 && (
        <ul className="mt-4 space-y-2">
          {flags.map((flag) => (
            <li
              key={flag.text}
              className={`flex gap-2 rounded-xl px-3 py-2.5 text-sm ${
                flag.severity === 'warning'
                  ? 'border border-clay/25 bg-clay/10 text-charcoal'
                  : 'border border-forest/20 bg-forest/5 text-charcoal'
              }`}
            >
              {flag.severity === 'warning' ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-clay-dark" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
              )}
              {flag.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
