import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  FileText,
  MapPin,
  Radar,
  Ruler,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { formatArea, formatChangeType } from "@/lib/format";
import type { DevelopmentCase } from "@/types";
import type {
  PlannerDetectionSelection,
  PlannerFeatureSelection,
} from "@/components/map/KilimaniMap";

type PlannerPanelSelection =
  | PlannerFeatureSelection
  | PlannerDetectionSelection;

function attr(attributes: Record<string, unknown>, key: string) {
  const value = attributes[key];
  return value == null || value === ""
    ? "Not available in current dataset"
    : String(value);
}

function distance(value: number | null | undefined) {
  return value == null || !Number.isFinite(value)
    ? "Not available in current dataset"
    : `${Math.round(value)} m`;
}

function fieldLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function downloadBrief(selection: PlannerPanelSelection) {
  const isDetection = selection.kind === "detection";
  const parcel =
    selection.attributes.parcel_num ?? selection.attributes.lr_number;
  const subject = String(
    parcel ?? (isDetection ? selection.detectionId : "brief"),
  );
  const lines = [
    "KILI-VAULT SPATIAL EVIDENCE BRIEF",
    "",
    `Subject: ${subject}`,
    `Observed change: ${isDetection ? selection.changeType.replace(/_/g, " ") : "Parcel context review"}`,
    isDetection
      ? `Confidence: ${Math.round(selection.confidence * 100)}%`
      : `Land use: ${attr(selection.attributes, "LANDUSE")}`,
    `Parcel / LR reference: ${String(parcel ?? "Not available in current dataset")}`,
    "",
    "Evidence scope",
    "- GIS parcel, building, road, river, and river-buffer context",
    isDetection
      ? "- Candidate satellite change requiring human verification"
      : "- Existing land-use and development context",
    "",
    "Limitations",
    "This is a factual spatial evidence brief, not an automatic compliance or legality verdict.",
    "Verify source imagery, field evidence, and planning records before a decision.",
    "",
    `Generated from: ${selection.layerTitle}`,
    `Generated: ${new Date().toISOString()}`,
  ];
  const url = URL.createObjectURL(
    new Blob([lines.join("\n")], { type: "text/plain" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `kili-vault-spatial-evidence-${subject.replace(/[^a-z0-9_-]/gi, "-")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function PlannerFeaturePanel({
  selection,
  cases,
  onClose,
}: {
  selection: PlannerPanelSelection | null;
  cases: DevelopmentCase[];
  onClose: () => void;
}) {
  if (!selection) return null;
  const parcelNumber =
    selection.attributes.parcel_num ?? selection.attributes.lr_number;
  const relatedCases =
    selection.kind === "parcel" && parcelNumber != null
      ? cases.filter((item) => item.parcelRef === String(parcelNumber))
      : [];
  const isParcel = selection.kind === "parcel";
  const isBuilding = selection.kind === "building";
  const isDetection = selection.kind === "detection";
  const context = "context" in selection ? selection.context : undefined;

  return (
    <aside
      className="pointer-events-auto absolute bottom-4 left-4 z-30 max-h-[calc(100%-2rem)] w-[min(25rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-sand bg-off-white/96 p-4 shadow-lift backdrop-blur-md"
      aria-label="Selected feature intelligence"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage">
            Planning context
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-charcoal">
            {isDetection ? (
              <Radar className="h-5 w-5 text-clay" />
            ) : isBuilding ? (
              <Building2 className="h-5 w-5 text-clay" />
            ) : (
              <MapPin className="h-5 w-5 text-clay" />
            )}
            {selection.layerTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-charcoal-muted hover:bg-mist/60 hover:text-charcoal"
          aria-label="Clear selected feature"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isDetection ? (
        <section className="mt-4 border-t border-sand pt-3">
          <div className="rounded-lg bg-clay/10 px-3 py-2 text-xs leading-relaxed text-clay-dark">
            Candidate change requiring human verification. This spatial
            relationship is not a legal determination.
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-charcoal-muted">Detection ID</dt>
              <dd className="font-semibold text-charcoal">
                {selection.detectionId}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal-muted">Confidence</dt>
              <dd className="font-semibold text-charcoal">
                {Math.round(selection.confidence * 100)}%
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-charcoal-muted">Change</dt>
              <dd className="font-semibold text-charcoal">
                {selection.changeType.replace(/_/g, " ")}
              </dd>
            </div>
          </dl>
          <div className="mt-3 grid gap-2">
            <Link
              to={`/planner/cases?search=${encodeURIComponent(selection.detectionId)}`}
            >
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-between"
              >
                Create or open case <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-between"
              onClick={() => downloadBrief(selection)}
            >
              Prepare LPLDP evidence brief <FileText className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-4 border-t border-sand pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
            Property
          </h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {(isParcel || isBuilding) && (
              <>
                <div>
                  <dt className="text-charcoal-muted">Parcel / plot</dt>
                  <dd className="font-semibold text-charcoal">
                    {String(
                      parcelNumber ?? attr(selection.attributes, "parcel_num"),
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-muted">Land use</dt>
                  <dd className="font-semibold text-charcoal">
                    {attr(selection.attributes, "LANDUSE")}
                  </dd>
                </div>
              </>
            )}
            {selection.context?.parcelAreaM2 != null && (
              <div>
                <dt className="text-charcoal-muted">Parcel area</dt>
                <dd className="font-semibold text-charcoal">
                  {formatArea(selection.context.parcelAreaM2)}
                </dd>
              </div>
            )}
            {selection.context?.buildingCount != null && (
              <div>
                <dt className="text-charcoal-muted">Mapped buildings</dt>
                <dd className="font-semibold text-charcoal">
                  {selection.context.buildingCount}
                </dd>
              </div>
            )}
            {selection.context?.buildingFootprintM2 != null && (
              <div>
                <dt className="text-charcoal-muted">Building footprint</dt>
                <dd className="font-semibold text-charcoal">
                  {formatArea(selection.context.buildingFootprintM2)}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="mt-4 border-t border-sand pt-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
          Spatial context
        </h3>
        <dl className="mt-2 grid gap-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-charcoal-muted">
              <Ruler className="h-3.5 w-3.5" /> Nearest road
            </dt>
            <dd className="font-semibold text-charcoal">
              {distance(context?.roadDistanceM)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-charcoal-muted">Nearest river</dt>
            <dd className="font-semibold text-charcoal">
              {distance(context?.riverDistanceM)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-charcoal-muted">15 m river buffer</dt>
            <dd className="font-semibold text-charcoal">
              {context?.riverBufferOverlap == null
                ? "Not assessed"
                : context.riverBufferOverlap
                  ? "Spatial relationship detected"
                  : "No overlap observed"}
            </dd>
          </div>
        </dl>
        {context?.riverBufferOverlap && (
          <p className="mt-2 rounded-lg bg-clay/10 px-3 py-2 text-xs leading-relaxed text-clay-dark">
            Planning review required. This is a spatial relationship, not a
            legal determination.
          </p>
        )}
      </section>

      {isParcel && (
        <section className="mt-4 border-t border-sand pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
            Planning actions
          </h3>
          <div className="mt-2 grid gap-2">
            <Link
              to={`/developer/simulator?parcel=${encodeURIComponent(String(parcelNumber ?? ""))}`}
            >
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-between"
              >
                Run development scenario <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link
              to={`/planner/cases?search=${encodeURIComponent(String(parcelNumber ?? ""))}`}
            >
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-between"
              >
                Review parcel cases <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-between"
              onClick={() => downloadBrief(selection)}
            >
              Prepare LPLDP evidence brief <FileText className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>
      )}

      {relatedCases.length > 0 && (
        <section className="mt-4 border-t border-sand pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
            Existing development cases
          </h3>
          <ul className="mt-2 space-y-2">
            {relatedCases.map((item) => (
              <li key={item.id} className="rounded-lg border border-sand p-2">
                <Link
                  to={`/planner/cases/${item.id}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    <span className="block text-xs font-semibold text-charcoal">
                      {item.caseNumber}
                    </span>
                    <span className="block text-[11px] text-charcoal-muted">
                      {formatChangeType(item.changeType)}
                    </span>
                  </span>
                  <CaseStatusBadge status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {isParcel && relatedCases.length === 0 && (
        <p className="mt-3 border-t border-sand pt-3 text-xs text-charcoal-muted">
          No recorded development case for this parcel.
        </p>
      )}

      <details className="mt-4 border-t border-sand pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-charcoal">
          View all attributes
        </summary>
        <dl className="mt-2 space-y-1.5 text-[11px]">
          {Object.entries(selection.attributes).map(([key, value]) => (
            <div
              key={key}
              className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2"
            >
              <dt className="truncate text-charcoal-muted" title={key}>
                {fieldLabel(key)}
              </dt>
              <dd className="break-words font-medium text-charcoal">
                {value == null || value === ""
                  ? "Not available"
                  : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <p className="mt-3 text-[10px] text-charcoal-muted">
        Source: {selection.layerTitle} ArcGIS FeatureServer
      </p>
    </aside>
  );
}
