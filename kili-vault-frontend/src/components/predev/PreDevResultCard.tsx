import { AlertTriangle, CheckCircle2, Download, Send } from 'lucide-react';
import { RiskBadge } from '@/components/cases/RiskBadge';
import { Button } from '@/components/ui/Button';
import { formatChangeType } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { PreDevelopmentAssessment } from '@/types';

function RiskRing({ score, level }: { score: number; level: string }) {
  const tone =
    level === 'HIGH'
      ? 'text-clay-dark border-clay/40 bg-clay/10'
      : level === 'MEDIUM'
        ? 'text-amber-800 border-amber-300/50 bg-amber-50'
        : 'text-forest border-forest/30 bg-forest/5';

  return (
    <div
      className={cn(
        'mx-auto flex h-28 w-28 flex-col items-center justify-center rounded-full border-4',
        tone,
      )}
    >
      <span className="font-display text-3xl font-bold tabular-nums">{score}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">Risk score</span>
    </div>
  );
}

export function PreDevResultCard({
  assessment,
  onDownload,
  onSubmit,
  isSubmitting,
}: {
  assessment: PreDevelopmentAssessment;
  onDownload: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const warnings = assessment.flags.filter((f) => f.severity === 'warning');
  const infos = assessment.flags.filter((f) => f.severity !== 'warning');
  const avgScore = Math.round(
    (assessment.risk.planning +
      assessment.risk.infrastructure +
      assessment.risk.environmental +
      assessment.risk.community) /
      4,
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sand bg-off-white p-6 text-center shadow-soft">
        <RiskRing score={avgScore} level={assessment.risk.overall} />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <RiskBadge level={assessment.risk.overall} />
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-charcoal">
            {formatChangeType(assessment.input.changeType)}
          </span>
        </div>
        <p className="mt-3 text-sm font-medium text-charcoal">{assessment.title}</p>
        <p className="mt-2 text-xs leading-relaxed text-charcoal-muted">
          {assessment.risk.overall === 'LOW'
            ? 'Looks manageable — still confirm with the ward before breaking ground.'
            : assessment.risk.overall === 'MEDIUM'
              ? 'Some planning flags — worth adjusting your proposal or talking to a planner early.'
              : 'Several red flags — strongly consider a formal planner review before you start.'}
        </p>
      </div>

      {(warnings.length > 0 || infos.length > 0) && (
        <div className="rounded-2xl border border-sand bg-off-white p-5">
          <p className="text-sm font-semibold text-charcoal">What stood out</p>
          <ul className="mt-3 space-y-2">
            {warnings.map((flag) => (
              <li
                key={flag.text}
                className="flex gap-2.5 rounded-xl border border-clay/25 bg-clay/8 px-3 py-2.5 text-sm text-charcoal"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-clay-dark" />
                {flag.text}
              </li>
            ))}
            {infos.slice(0, 2).map((flag) => (
              <li
                key={flag.text}
                className="flex gap-2.5 rounded-xl bg-mist/40 px-3 py-2.5 text-sm text-charcoal-muted"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                {flag.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-forest/20 bg-forest/5 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-forest">Not a permit</p>
        <p className="mt-1 text-xs leading-relaxed text-charcoal-muted">
          {assessment.disclaimer}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" className="w-full gap-2" isLoading={isSubmitting} onClick={onSubmit}>
          <Send className="h-4 w-4" />
          Send to planner for review
        </Button>
        <Button variant="outline" size="md" className="w-full gap-2" onClick={onDownload}>
          <Download className="h-4 w-4" />
          Save assessment (JSON)
        </Button>
      </div>
    </div>
  );
}
