import { Link } from "react-router-dom";
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

const FEATURE_SUMMARY_FIELDS: Record<string, string[]> = {
  "points-of-interest": ["name", "fclass"],
  "cultural-places": [
    "name",
    "name_en",
    "tourism",
    "amenity",
    "historic",
    "heritage",
    "operator",
  ],
  "education-facilities": [
    "name",
    "name_en",
    "amenity",
    "building",
    "operator_t",
    "capacity_p",
    "addr_full",
  ],
  "health-facilities": [
    "name",
    "name_en",
    "amenity",
    "healthcare",
    "healthca_1",
    "operator_t",
    "capacity_p",
    "addr_full",
  ],
  roads: ["name", "ref", "fclass", "maxspeed", "oneway"],
  "power-lines": ["RCC1", "County2", "Branch3", "Feeder_o21", "voltage48"],
  "power-lines-66kv": [
    "RCC1",
    "County2",
    "Branch3",
    "Primary_6",
    "Feeder_o17",
    "Voltage47",
  ],
};

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
  const returnedAttributes = Object.entries(selection.attributes).filter(
    ([, value]) => value != null && value !== "",
  );
  const summaryFields = FEATURE_SUMMARY_FIELDS[selection.layerId] ?? [];
  const summaryAttributes = summaryFields
    .map((key) => [key, selection.attributes[key]] as const)
    .filter(([, value]) => value != null && value !== "");

  return (
    <calcite-panel
      heading={isParcel ? "Planning context" : selection.layerTitle}
      description={isParcel ? selection.layerTitle : undefined}
      className="pointer-events-auto absolute bottom-4 left-4 z-30 max-h-[calc(100%-2rem)] w-[min(26rem,calc(100%-2rem))] overflow-y-auto"
    >
      <calcite-button
        slot="header-actions-end"
        appearance="transparent"
        icon-start="x"
        label="Clear selected feature"
        onClick={onClose}
      />

      {isDetection ? (
        <section className="mt-4 border-t border-sand pt-3">
          <calcite-notice open scale="s" kind="warning">
            Candidate change requiring human verification. This spatial
            relationship is not a legal determination.
          </calcite-notice>
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
              <calcite-button appearance="solid" scale="s" className="w-full">
                Create or open case
              </calcite-button>
            </Link>
            <calcite-button
              appearance="outline"
              scale="s"
              className="w-full"
              onClick={() => downloadBrief(selection)}
            >
              Prepare LPLDP evidence brief
            </calcite-button>
          </div>
        </section>
      ) : (
        <section className="border-t border-sand px-4 py-3">
          <h3 className="text-sm font-semibold text-charcoal">Property</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
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
            {context?.parcelAreaM2 != null && (
              <div>
                <dt className="text-charcoal-muted">Parcel area</dt>
                <dd className="font-semibold text-charcoal">
                  {formatArea(context.parcelAreaM2)}
                </dd>
              </div>
            )}
            {context?.parcelReference != null && (
              <div>
                <dt className="text-charcoal-muted">Intersecting parcel / plot</dt>
                <dd className="font-semibold text-charcoal">
                  {context.parcelReference}
                </dd>
              </div>
            )}
            {context?.parcelLandUse != null && (
              <div>
                <dt className="text-charcoal-muted">Parcel land use</dt>
                <dd className="font-semibold text-charcoal">
                  {context.parcelLandUse}
                </dd>
              </div>
            )}
            {context?.intersectingParcelCount != null &&
              context.intersectingParcelCount > 1 && (
                <div>
                  <dt className="text-charcoal-muted">Intersecting parcels</dt>
                  <dd className="font-semibold text-charcoal">
                    {context.intersectingParcelCount}
                  </dd>
                </div>
              )}
            {context?.buildingCount != null && (
              <div>
                <dt className="text-charcoal-muted">Mapped buildings</dt>
                <dd className="font-semibold text-charcoal">
                  {context.buildingCount}
                </dd>
              </div>
            )}
            {context?.buildingFootprintM2 != null && (
              <div>
                <dt className="text-charcoal-muted">Building footprint</dt>
                <dd className="font-semibold text-charcoal">
                  {formatArea(context.buildingFootprintM2)}
                </dd>
              </div>
            )}
          </dl>
          {!isParcel && !isBuilding && summaryAttributes.length > 0 && (
            <div className="mt-4 border-t border-sand pt-3">
              <h3 className="text-sm font-semibold text-charcoal">
                Key details
              </h3>
              <dl className="mt-2 grid gap-2 text-xs">
                {summaryAttributes.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="text-charcoal-muted">{fieldLabel(key)}</dt>
                    <dd className="max-w-[62%] break-words text-right font-medium text-charcoal">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {returnedAttributes.length > summaryAttributes.length && (
            <calcite-block
              heading="View all attributes"
              className="mt-3 border-t border-sand pt-2"
            >
              <dl className="grid gap-2 text-xs">
                {returnedAttributes
                  .filter(([key]) => !summaryFields.includes(key))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-3"
                    >
                      <dt className="text-charcoal-muted">{fieldLabel(key)}</dt>
                      <dd className="max-w-[62%] break-words text-right font-medium text-charcoal">
                        {String(value)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </calcite-block>
          )}
        </section>
      )}

      <section className="border-t border-sand px-4 py-3">
        <h3 className="text-sm font-semibold text-charcoal">Spatial context</h3>
        <dl className="mt-3 grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-charcoal-muted">Nearest road</dt>
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
          <calcite-notice open scale="s" kind="warning" className="mt-3">
            Planning review required. This is a spatial relationship, not a
            legal determination.
          </calcite-notice>
        )}
      </section>

      {isParcel && (
        <section className="border-t border-sand px-4 py-3">
          <h3 className="text-sm font-semibold text-charcoal">
            Planning actions
          </h3>
          <div className="mt-3 grid gap-2">
            <Link
              to={`/developer/simulator?parcel=${encodeURIComponent(String(parcelNumber ?? ""))}`}
            >
              <calcite-button appearance="solid" scale="s" className="w-full">
                Run development scenario
              </calcite-button>
            </Link>
            <Link
              to={`/planner/cases?search=${encodeURIComponent(String(parcelNumber ?? ""))}`}
            >
              <calcite-button appearance="outline" scale="s" className="w-full">
                Review parcel cases
              </calcite-button>
            </Link>
            <calcite-button
              appearance="outline"
              scale="s"
              className="w-full"
              onClick={() => downloadBrief(selection)}
            >
              Prepare LPLDP evidence brief
            </calcite-button>
          </div>
        </section>
      )}

      {relatedCases.length > 0 && (
        <section className="border-t border-sand px-4 py-3">
          <h3 className="mb-3 text-sm font-semibold text-charcoal">
            Existing development cases
          </h3>
          <calcite-list label="Existing development cases">
            {relatedCases.map((item) => (
              <calcite-list-item
                key={item.id}
                label={item.caseNumber}
                description={`${formatChangeType(item.changeType)} · ${item.status.replace(/_/g, " ")}`}
                onClick={() => {
                  window.location.assign(`/planner/cases/${item.id}`);
                }}
              />
            ))}
          </calcite-list>
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
    </calcite-panel>
  );
}
