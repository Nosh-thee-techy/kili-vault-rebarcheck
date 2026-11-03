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

      {(caseItem.evidenceItems?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-sand pt-4">
          <h3 className="text-sm font-semibold text-charcoal">Evidence provenance</h3>
          <ul className="mt-2 space-y-2 text-xs text-charcoal-muted">
            {caseItem.evidenceItems!.map((item) => {
              const metadata = item.metadata;
              const hasLocation = metadata?.latitude != null && metadata.longitude != null;
              return (
                <li key={item.id} className="rounded-xl border border-sand bg-mist/20 p-3">
                  <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-charcoal">{item.fileName}</span><span className="capitalize">{item.status}</span></div>
                  <p className="mt-1">{hasLocation ? `Geotag: ${metadata.latitude!.toFixed(5)}, ${metadata.longitude!.toFixed(5)}${metadata.accuracyM != null ? ` ±${Math.round(metadata.accuracyM)} m` : ''}` : 'No device geotag recorded.'}</p>
                  {metadata?.parcelRef && <p>Parcel reference: {metadata.parcelRef}</p>}
                  {metadata?.detectionId && <p>Detection reference: {metadata.detectionId}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
