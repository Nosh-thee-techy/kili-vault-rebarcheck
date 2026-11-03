import { AlertCircle, ChevronDown, FileText } from 'lucide-react';
import { formatConfidence, formatDate } from '@/lib/format';
import type { DevelopmentCase } from '@/types';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-sand py-2.5 text-sm last:border-0">
      <dt className="shrink-0 text-charcoal-muted">{label}</dt>
      <dd className="text-right font-medium text-charcoal">{value}</dd>
    </div>
  );
}

export function CaseEvidencePanel({ caseItem }: { caseItem: DevelopmentCase }) {
  const isPreDevelopment = Boolean(caseItem.evidence?.preDevelopment);
  const linked = caseItem.linkedDetection;

  return (
    <div className="text-sm">
      <dl>
        {!isPreDevelopment && (
          <DetailRow label="Parcel" value={caseItem.parcelRef ?? '—'} />
        )}
        {caseItem.detectionId && (
          <DetailRow
            label="Detection ID"
            value={<span className="font-mono text-xs">{caseItem.detectionId.slice(0, 8)}…</span>}
          />
        )}
        {caseItem.assignedDeveloperId && (
          <DetailRow label="Developer" value={caseItem.assignedDeveloperId} />
        )}
        {isPreDevelopment && caseItem.evidence?.proposedFloors != null && (
          <DetailRow label="Proposed floors" value={caseItem.evidence.proposedFloors} />
        )}
        {isPreDevelopment && caseItem.evidence?.coveragePercent != null && (
          <DetailRow label="Ground coverage" value={`${caseItem.evidence.coveragePercent}%`} />
        )}
        {isPreDevelopment && caseItem.evidence?.setbackMeters != null && (
          <DetailRow label="Setback" value={`${caseItem.evidence.setbackMeters} m`} />
        )}
      </dl>

      {isPreDevelopment && caseItem.evidence?.description && (
        <div className="mt-4 flex gap-3 rounded-xl bg-mist/40 p-4">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
          <p className="text-sm leading-relaxed text-charcoal">{caseItem.evidence.description}</p>
        </div>
      )}

      {linked && (
        <details className="group mt-4 rounded-xl border border-sand bg-mist/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-charcoal [&::-webkit-details-marker]:hidden">
            <span>Kili-Shadows model scores</span>
            <ChevronDown className="h-4 w-4 text-charcoal-muted transition-transform group-open:rotate-180" />
          </summary>
          <dl className="space-y-0 border-t border-sand px-4 pb-3 pt-1">
            {linked.ndbiChange != null && (
              <DetailRow label="NDBI change" value={linked.ndbiChange.toFixed(3)} />
            )}
            {linked.ndviChange != null && (
              <DetailRow label="NDVI change" value={linked.ndviChange.toFixed(3)} />
            )}
            {linked.baselineProbability != null && (
              <DetailRow label="Baseline model" value={formatConfidence(linked.baselineProbability)} />
            )}
            {linked.prithviProbability != null && (
              <DetailRow label="Prithvi model" value={formatConfidence(linked.prithviProbability)} />
            )}
            {linked.temporalPersistence != null && (
              <DetailRow label="Persistence" value={formatConfidence(linked.temporalPersistence)} />
            )}
            {linked.modelVersion && (
              <DetailRow
                label="Model version"
                value={<span className="font-mono text-xs">{linked.modelVersion}</span>}
              />
            )}
            {linked.createdAt && (
              <DetailRow label="Detected" value={formatDate(linked.createdAt)} />
            )}
          </dl>
        </details>
      )}

      {caseItem.evidence?.explanation && (
        <div className="mt-4 flex gap-3 rounded-xl bg-mist/40 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
          <p className="text-sm leading-relaxed text-charcoal">{caseItem.evidence.explanation}</p>
        </div>
      )}
    </div>
  );
}
